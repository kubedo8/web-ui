/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Collection} from '../../../core/store/collections/collection';
import {DocumentModel} from '../../../core/store/documents/document.model';
import {LinkInstancesAction} from '../../../core/store/link-instances/link-instances.action';
import {AppState} from '../../../core/store/app.state';
import {select, Store} from '@ngrx/store';
import {NavigationAction} from '../../../core/store/navigation/navigation.action';
import {Query} from '../../../core/store/navigation/query/query';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {selectCollectionById} from '../../../core/store/collections/collections.state';
import {debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap, take, tap} from 'rxjs/operators';
import {selectDocumentById, selectQueryDocumentsLoaded} from '../../../core/store/documents/documents.state';
import {selectNavigation, selectViewCursor} from '../../../core/store/navigation/navigation.state';
import {AllowedPermissions} from '../../../core/model/allowed-permissions';
import {
  selectCollectionsByQueryWithoutLinks,
  selectReadableCollections,
  selectDocumentsByCustomQuery,
} from '../../../core/store/common/permissions.selectors';
import {
  filterStemsForCollection,
  getQueryFiltersForCollection,
  isNavigatingToOtherWorkspace,
  queryContainsOnlyFulltexts,
  queryIsEmpty,
} from '../../../core/store/navigation/query/query.util';
import {DocumentsAction} from '../../../core/store/documents/documents.action';
import {ViewCursor} from '../../../core/store/navigation/view-cursor/view-cursor';
import {selectCollectionPermissions} from '../../../core/store/user-permissions/user-permissions.state';
import {selectViewDataQuery, selectViewSettings} from '../../../core/store/view-settings/view-settings.state';
import {DataQuery} from '../../../core/model/data-query';
import {ViewSettings} from '../../../core/store/views/view';
import {selectConstraintData} from '../../../core/store/constraint-data/constraint-data.state';
import {generateDocumentData} from '../../../core/store/documents/document.utils';
import {createFlatResourcesSettingsQuery} from '../../../core/store/details/detail.utils';

@Component({
  selector: 'detail-perspective',
  templateUrl: './detail-perspective.component.html',
  styleUrls: ['./detail-perspective.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPerspectiveComponent implements OnInit, OnDestroy {
  @Input()
  public embedded: boolean;

  public query$: Observable<Query>;
  public viewSettings$: Observable<ViewSettings>;
  public collectionPermission$: Observable<AllowedPermissions>;
  public settingsQuery$: Observable<Query>;

  public selected$ = new BehaviorSubject<{collection?: Collection; document?: DocumentModel}>({});
  public creatingDocument$ = new BehaviorSubject(false);

  private query: Query;
  private collectionSubscription = new Subscription();
  private subscriptions = new Subscription();
  private selectionSubscription = new Subscription();

  public constructor(private store$: Store<AppState>) {}

  public ngOnInit() {
    this.query$ = this.store$.pipe(
      select(selectViewDataQuery),
      tap(query => this.onQueryChanged(query))
    );
    this.settingsQuery$ = this.store$.pipe(
      select(selectReadableCollections),
      map(collections => createFlatResourcesSettingsQuery(collections))
    );
    this.viewSettings$ = this.store$.pipe(select(selectViewSettings));
    this.initSelection();
  }

  private onQueryChanged(query: DataQuery) {
    this.query = query;

    if (queryContainsOnlyFulltexts(query)) {
      this.store$.dispatch(new DocumentsAction.Get({query}));
    }
  }

  private initSelection() {
    this.selectionSubscription = combineLatest([
      this.store$.pipe(select(selectCollectionsByQueryWithoutLinks)),
      this.store$.pipe(select(selectNavigation)),
      this.store$.pipe(select(selectViewCursor)),
    ])
      .pipe(
        switchMap(([collections, navigation, cursor]) => {
          const selectedCollection =
            (cursor && (collections || []).find(coll => coll.id === cursor.collectionId)) || collections?.[0];
          if (selectedCollection) {
            const collectionQuery = filterStemsForCollection(selectedCollection.id, navigation?.query);
            this.store$.dispatch(new DocumentsAction.Get({query: collectionQuery}));
            return this.store$.pipe(
              select(selectDocumentsByCustomQuery(collectionQuery)),
              map(documents => {
                const document =
                  (cursor && (documents || []).find(doc => doc.id === cursor.documentId)) || documents?.[0];
                return {collection: selectedCollection, document, navigation};
              })
            );
          }
          return of({collection: null, document: null, navigation});
        }),
        debounceTime(100),
        distinctUntilChanged((a, b) => this.selectionIsSame(a, b))
      )
      .subscribe(({collection, document, navigation}) => {
        if (collection) {
          const selectedCollection = this.selected$.value.collection;
          const selectedDocument = this.selected$.value.document;

          const collectionIsSame = selectedCollection && collection.id === selectedCollection.id;
          const documentIsSame = selectedDocument && document && document.id === selectedDocument.id;

          if (
            !isNavigatingToOtherWorkspace(navigation.workspace, navigation.navigatingWorkspace) &&
            (!collectionIsSame || !documentIsSame)
          ) {
            this.select(collection, document);
          }
        } else {
          this.selected$.next({});
        }
      });
  }

  private selectionIsSame(
    a: {collection: Collection; document: DocumentModel},
    b: {collection: Collection; document: DocumentModel}
  ): boolean {
    const collectionsAreSame =
      (!a.collection && !b.collection) || (a.collection && b.collection && a.collection.id === b.collection.id);
    const documentsAreSame =
      (!a.document && !b.document) || (a.document && b.document && a.document.id === b.document.id);
    return collectionsAreSame && documentsAreSame;
  }

  public ngOnDestroy() {
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    this.selectionSubscription.unsubscribe();
    this.collectionSubscription.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  public selectCollection(collection: Collection) {
    const subscription = this.store$
      .pipe(
        select(selectViewDataQuery),
        switchMap(query => {
          const collectionQuery = filterStemsForCollection(collection.id, query);
          return this.store$.pipe(
            select(selectQueryDocumentsLoaded(collectionQuery)),
            tap(loaded => {
              if (!loaded) {
                this.store$.dispatch(new DocumentsAction.Get({query: collectionQuery}));
              }
            }),
            filter(loaded => loaded),
            mergeMap(() =>
              this.store$.pipe(
                select(selectDocumentsByCustomQuery(collectionQuery)),
                map(documents => documents?.[0])
              )
            )
          );
        }),
        take(1)
      )
      .subscribe(document => this.select(collection, document));
    this.subscriptions.add(subscription);
  }

  public selectDocument(document: DocumentModel) {
    this.select(this.selected$.value.collection, document);
    this.loadLinkInstances(document);
  }

  public selectCollectionAndDocument(data: {collection: Collection; document: DocumentModel}) {
    const currentQueryIsEmpty = queryIsEmpty(this.query);
    const query: Query = currentQueryIsEmpty ? null : {stems: [{collectionId: data.collection.id}]};
    this.select(data.collection, data.document, query);
  }

  private select(selectedCollection: Collection, selectedDocument: DocumentModel, query?: Query) {
    this.collectionPermission$ = this.store$.pipe(select(selectCollectionPermissions(selectedCollection.id)));

    this.collectionSubscription.unsubscribe();
    this.collectionSubscription = combineLatest([
      this.store$.pipe(select(selectCollectionById(selectedCollection.id))),
      selectedDocument ? this.store$.pipe(select(selectDocumentById(selectedDocument.id))) : of(null),
    ]).subscribe(([collection, document]) => {
      if (collection) {
        this.selected$.next({collection, document});
      }
    });

    const cursor: ViewCursor = {
      collectionId: selectedCollection.id,
      documentId: selectedDocument?.id,
    };

    if (query) {
      this.store$.dispatch(new NavigationAction.RemoveViewFromUrl({setQuery: query, cursor}));
    } else {
      this.store$.dispatch(new NavigationAction.SetViewCursor({cursor}));
    }
  }

  private loadLinkInstances(document: DocumentModel) {
    if (document) {
      const query: Query = {stems: [{collectionId: document.collectionId, documentIds: [document.id]}]};
      this.store$.dispatch(new LinkInstancesAction.Get({query}));
    }
  }

  public addDocument() {
    const collection = this.selected$.value.collection;
    if (collection) {
      combineLatest([this.store$.pipe(select(selectViewDataQuery)), this.store$.pipe(select(selectConstraintData))])
        .pipe(take(1))
        .subscribe(([query, constraintData]) => {
          const queryFilters = getQueryFiltersForCollection(query, collection.id);
          const data = generateDocumentData(collection, queryFilters, constraintData, true);
          const document = {data, collectionId: collection.id};

          this.creatingDocument$.next(true);

          this.store$.dispatch(
            new DocumentsAction.Create({
              document,
              onSuccess: () => this.creatingDocument$.next(false),
              onFailure: () => this.creatingDocument$.next(false),
              afterSuccess: createdDocument => this.selectDocument(createdDocument),
            })
          );
        });
    }
  }
}
