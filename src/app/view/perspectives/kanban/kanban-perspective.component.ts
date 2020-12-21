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

import {Component, OnInit, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {AppState} from '../../../core/store/app.state';
import {combineLatest, Observable, of, Subscription} from 'rxjs';
import {Query} from '../../../core/store/navigation/query/query';
import {DocumentsAction} from '../../../core/store/documents/documents.action';
import {selectCurrentView, selectViewQuery} from '../../../core/store/views/views.state';
import {map, mergeMap, pairwise, startWith, switchMap, take, tap, withLatestFrom} from 'rxjs/operators';
import {selectKanbanById, selectKanbanConfig} from '../../../core/store/kanbans/kanban.state';
import {DEFAULT_KANBAN_ID, KanbanConfig} from '../../../core/store/kanbans/kanban';
import {View} from '../../../core/store/views/view';
import {KanbansAction} from '../../../core/store/kanbans/kanbans.action';
import {Collection} from '../../../core/store/collections/collection';
import {DocumentModel} from '../../../core/store/documents/document.model';
import {
  selectCanManageViewConfig,
  selectCollectionsByQuery,
  selectDocumentsAndLinksByQuerySorted,
  selectLinkTypesInQuery,
} from '../../../core/store/common/permissions.selectors';
import {checkOrTransformKanbanConfig} from './util/kanban.util';
import {ConstraintData} from '../../../core/model/data/constraint';
import {LinkType} from '../../../core/store/link-types/link.type';
import {LinkInstance} from '../../../core/store/link-instances/link.instance';
import {LinkInstancesAction} from '../../../core/store/link-instances/link-instances.action';
import {Workspace} from '../../../core/store/navigation/workspace';
import {selectWorkspaceWithIds} from '../../../core/store/common/common.selectors';
import {selectConstraintData} from '../../../core/store/constraint-data/constraint-data.state';
import {preferViewConfigUpdate} from '../../../core/store/views/view.utils';
import {AllowedPermissions} from '../../../core/model/allowed-permissions';
import {
  selectCollectionsPermissions,
  selectLinkTypesPermissions,
} from '../../../core/store/user-permissions/user-permissions.state';

@Component({
  templateUrl: './kanban-perspective.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanPerspectiveComponent implements OnInit, OnDestroy {
  public config$: Observable<KanbanConfig>;
  public canManageConfig$: Observable<boolean>;
  public documentsAndLinks$: Observable<{documents: DocumentModel[]; linkInstances: LinkInstance[]}>;
  public linkTypes$: Observable<LinkType[]>;
  public collections$: Observable<Collection[]>;
  public query$: Observable<Query>;
  public constraintData$: Observable<ConstraintData>;
  public workspace$: Observable<Workspace>;
  public permissions$: Observable<Record<string, AllowedPermissions>>;
  public linkTypesPermissions$: Observable<Record<string, AllowedPermissions>>;

  private subscriptions = new Subscription();
  private kanbanId: string;

  constructor(private store$: Store<AppState>) {}

  public ngOnInit() {
    this.initKanban();
    this.subscribeToQuery();
    this.subscribeData();
  }

  private initKanban() {
    const subscription = this.store$
      .pipe(
        select(selectCurrentView),
        startWith(null as View),
        pairwise(),
        switchMap(([previousView, view]) =>
          view ? this.subscribeToView(previousView, view) : this.subscribeToDefault()
        )
      )
      .subscribe(({kanbanId, config}: {kanbanId?: string; config?: KanbanConfig}) => {
        if (kanbanId) {
          this.kanbanId = kanbanId;
          this.store$.dispatch(new KanbansAction.AddKanban({kanban: {id: kanbanId, config}}));
        }
      });
    this.subscriptions.add(subscription);
  }

  private subscribeToView(previousView: View, view: View): Observable<{kanbanId?: string; config?: KanbanConfig}> {
    const kanbanId = view.code;
    return this.store$.pipe(
      select(selectKanbanById(kanbanId)),
      take(1),
      mergeMap(kanbanEntity => {
        const kanbanConfig = view.config?.kanban;
        if (preferViewConfigUpdate(previousView?.config?.kanban, view?.config?.kanban, !!kanbanEntity)) {
          return this.checkKanbanConfig(kanbanConfig).pipe(map(config => ({kanbanId, config})));
        }
        return of({kanbanId, config: kanbanEntity?.config || kanbanConfig});
      })
    );
  }

  private checkKanbanConfig(config: KanbanConfig): Observable<KanbanConfig> {
    return combineLatest([
      this.store$.pipe(select(selectViewQuery)),
      this.store$.pipe(select(selectCollectionsByQuery)),
      this.store$.pipe(select(selectLinkTypesInQuery)),
    ]).pipe(
      take(1),
      map(([query, collections, linkTypes]) => checkOrTransformKanbanConfig(config, query, collections, linkTypes))
    );
  }

  private subscribeToDefault(): Observable<{kanbanId?: string; config?: KanbanConfig}> {
    const kanbanId = DEFAULT_KANBAN_ID;
    return this.store$.pipe(
      select(selectViewQuery),
      withLatestFrom(this.store$.pipe(select(selectKanbanById(kanbanId)))),
      mergeMap(([, kanban]) => this.checkKanbanConfig(kanban?.config)),
      map(config => ({kanbanId, config}))
    );
  }

  private subscribeToQuery() {
    this.query$ = this.store$.pipe(
      select(selectViewQuery),
      tap(query => this.fetchData(query))
    );
  }

  private fetchData(query: Query) {
    this.store$.dispatch(new DocumentsAction.Get({query}));
    this.store$.dispatch(new LinkInstancesAction.Get({query}));
  }

  private subscribeData() {
    this.collections$ = this.store$.pipe(select(selectCollectionsByQuery));
    this.linkTypes$ = this.store$.pipe(select(selectLinkTypesInQuery));
    this.documentsAndLinks$ = this.store$.pipe(select(selectDocumentsAndLinksByQuerySorted));
    this.config$ = this.store$.pipe(select(selectKanbanConfig));
    this.canManageConfig$ = this.store$.pipe(select(selectCanManageViewConfig));
    this.constraintData$ = this.store$.pipe(select(selectConstraintData));
    this.workspace$ = this.store$.pipe(select(selectWorkspaceWithIds));
    this.permissions$ = this.store$.pipe(select(selectCollectionsPermissions));
    this.linkTypesPermissions$ = this.store$.pipe(select(selectLinkTypesPermissions));
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public onConfigChanged(config: KanbanConfig) {
    if (this.kanbanId) {
      this.store$.dispatch(new KanbansAction.SetConfig({kanbanId: this.kanbanId, config}));
    }
  }
}
