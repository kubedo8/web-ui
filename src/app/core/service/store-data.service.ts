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

import {Injectable} from '@angular/core';
import {AppState} from '../store/app.state';
import {AttributesResourceType, DataResourceDataValues} from '../model/resource';
import {select, Store} from '@ngrx/store';
import {DocumentModel} from '../store/documents/document.model';
import {selectAllDocuments, selectDocumentsDictionary} from '../store/documents/documents.state';
import {combineLatest, Observable, of} from 'rxjs';
import {map, tap, withLatestFrom} from 'rxjs/operators';
import {selectAllCollections, selectCollectionsDictionary} from '../store/collections/collections.state';
import {selectConstraintData} from '../store/constraint-data/constraint-data.state';
import {Collection} from '../store/collections/collection';
import {ConstraintData} from '../model/data/constraint';
import {convertDataToDataValues, sortDataResourcesByViewSettings} from '../../shared/utils/data-resource.utils';
import {Selector} from '@ngrx/store/src/models';
import {selectAllLinkTypes, selectLinkTypesDictionary} from '../store/link-types/link-types.state';
import {selectViewQuery} from '../store/views/views.state';
import {filterCollectionsByQuery} from '../store/collections/collections.filters';
import {
  getAllCollectionIdsFromQuery,
  getAllLinkTypeIdsFromQuery,
  queryWithoutLinks,
} from '../store/navigation/query/query.util';
import {Role} from '../model/role';
import {
  selectCollectionsPermissions,
  selectLinkTypesPermissions,
  selectResourcesPermissions,
} from '../store/user-permissions/user-permissions.state';
import {hasRoleByPermissions} from '../../shared/utils/resource.utils';
import {uniqueValues} from '../../shared/utils/array.utils';
import {Query} from '../store/navigation/query/query';
import {selectAllLinkInstances, selectLinkInstancesDictionary} from '../store/link-instances/link-instances.state';
import {filterDocumentsAndLinksByQuery} from '../store/documents/documents.filters';
import {LinkInstance} from '../store/link-instances/link.instance';
import {selectViewSettings} from '../store/view-settings/view-settings.state';
import {LinkType} from '../store/link-types/link.type';
import {sortDocumentsByCreationDate} from '../store/documents/document.utils';
import {isLinkInstanceValid, sortLinkInstances} from '../store/link-instances/link-instance.utils';
import {mapLinkTypeCollections} from '../../shared/utils/link-type.utils';
import {Actions, ofType} from '@ngrx/effects';
import {DocumentsAction, DocumentsActionType} from '../store/documents/documents.action';
import {LinkInstancesAction, LinkInstancesActionType} from '../store/link-instances/link-instances.action';
import {CollectionsAction, CollectionsActionType} from '../store/collections/collections.action';
import {LinkTypesAction, LinkTypesActionType} from '../store/link-types/link-types.action';

// first key is resourceId (collection/linkType), the send one is dataResourceId (documentId,linkInstanceId)
type DataResourceCache = Record<string, Record<string, DataResourceDataValues>>;

@Injectable({
  providedIn: 'root',
})
export class StoreDataService {
  private documentsCache: DataResourceCache = {};
  private linksCache: DataResourceCache = {};

  constructor(public store$: Store<AppState>, private actions$: Actions) {

    this.actions$
      .pipe(ofType<DocumentsAction.PatchData>(DocumentsActionType.PATCH_DATA))
      .subscribe(action => this.clearDocumentCache(action.payload.document));

    this.actions$
      .pipe(ofType<DocumentsAction.UpdateData>(DocumentsActionType.UPDATE_DATA))
      .subscribe(action => this.clearDocumentCache(action.payload.document));

    this.actions$
      .pipe(ofType<DocumentsAction.UpdateSuccess>(DocumentsActionType.UPDATE_SUCCESS))
      .subscribe(action => this.clearDocumentCache(action.payload.document));

    this.actions$
      .pipe(ofType<DocumentsAction.UpdateFailure>(DocumentsActionType.UPDATE_FAILURE))
      .subscribe(action => this.clearDocumentCache(action.payload.originalDocument));

    this.actions$
      .pipe(ofType<LinkInstancesAction.PatchData>(LinkInstancesActionType.PATCH_DATA))
      .subscribe(action => this.clearLinkCache(action.payload.linkInstance));

    this.actions$
      .pipe(ofType<LinkInstancesAction.UpdateData>(LinkInstancesActionType.UPDATE_DATA))
      .subscribe(action => this.clearLinkCache(action.payload.linkInstance));

    this.actions$
      .pipe(ofType<LinkInstancesAction.UpdateSuccess>(LinkInstancesActionType.UPDATE_SUCCESS))
      .subscribe(action => this.clearLinkCache(action.payload.linkInstance));

    this.actions$
      .pipe(ofType<LinkInstancesAction.UpdateFailure>(LinkInstancesActionType.UPDATE_FAILURE))
      .subscribe(action => this.clearLinkCache(action.payload.originalLinkInstance));

    this.actions$
      .pipe(ofType<CollectionsAction.CreateAttributesSuccess>(CollectionsActionType.CREATE_ATTRIBUTES_SUCCESS))
      .subscribe(action => this.clearCollectionCache(action.payload.collectionId));

    this.actions$
      .pipe(ofType<CollectionsAction.DeleteSuccess>(CollectionsActionType.DELETE_SUCCESS))
      .subscribe(action => this.clearCollectionCache(action.payload.collectionId));

    this.actions$
      .pipe(ofType<CollectionsAction.ChangeAttributeSuccess>(CollectionsActionType.CHANGE_ATTRIBUTE_SUCCESS))
      .subscribe(action => this.clearCollectionCache(action.payload.collectionId));

    this.actions$
      .pipe(ofType<LinkTypesAction.CreateAttributesSuccess>(LinkTypesActionType.CREATE_ATTRIBUTES_SUCCESS))
      .subscribe(action => this.clearLinkTypeCache(action.payload.linkTypeId));

    this.actions$
      .pipe(ofType<LinkTypesAction.UpdateAttributeSuccess>(LinkTypesActionType.UPDATE_ATTRIBUTE_SUCCESS))
      .subscribe(action => this.clearLinkTypeCache(action.payload.linkTypeId));

    this.actions$
      .pipe(ofType<LinkTypesAction.DeleteSuccess>(LinkTypesActionType.DELETE_SUCCESS))
      .subscribe(action => this.clearLinkTypeCache(action.payload.linkTypeId));
  }

  private clearDocumentCache(document: DocumentModel) {
    delete this.documentsCache[document.collectionId]?.[document.id];
  }

  private clearCollectionCache(collectionId: string) {
    delete this.documentsCache[collectionId];
  }

  private clearLinkCache(linkInstance: LinkInstance) {
    delete this.linksCache[linkInstance.linkTypeId]?.[linkInstance.id];
  }

  private clearLinkTypeCache(linkTypeId: string) {
    delete this.linksCache[linkTypeId];
  }

  public selectCollectionsByReadPermission$(): Observable<Collection[]> {
    return this.selectCollectionsByPermission$(Role.Read);
  }

  public selectCollectionsByWritePermission$(): Observable<Collection[]> {
    return this.selectCollectionsByPermission$(Role.Read);
  }

  private selectCollectionsByPermission$(role: Role): Observable<Collection[]> {
    return combineLatest([this.select$(selectCollectionsPermissions), this.select$(selectAllCollections)]).pipe(
      map(([permissions, collections]) =>
        collections.filter(collection => hasRoleByPermissions(role, permissions[collection.id]))
      )
    );
  }

  public selectCollectionsByQuery$(excludeLinks?: boolean): Observable<Collection[]> {
    return combineLatest([
      this.selectCollectionsByReadPermission$(),
      this.select$(selectAllDocuments),
      this.select$(selectAllLinkTypes),
      this.select$(selectViewQuery),
    ]).pipe(
      withLatestFrom(
        this.store$.pipe(select(selectCollectionsDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([[collections, documents, linkTypes, query], collectionsMap, constraintData]) => {
        let filterDocuments = [];
        if (query.fulltexts?.length) {
          // documents are used only for full text search
          filterDocuments = this.mapDocuments(documents, collectionsMap, constraintData);
        }

        return filterCollectionsByQuery(
          collections,
          filterDocuments,
          linkTypes,
          excludeLinks ? queryWithoutLinks(query) : query
        );
      })
    );
  }

  public selectCollectionsByCustomQuery$(query: Query): Observable<Collection[]> {
    return combineLatest([
      this.selectCollectionsByReadPermission$(),
      query?.fulltexts?.length ? this.select$(selectAllDocuments) : of<DocumentModel[]>([]), // documents are used only for full text search
      this.select$(selectAllLinkTypes),
    ]).pipe(
      withLatestFrom(
        this.store$.pipe(select(selectCollectionsDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([[collections, documents, linkTypes], collectionsMap, constraintData]) => {
        const mappedDocuments = this.mapDocuments(documents, collectionsMap, constraintData);
        return filterCollectionsByQuery(collections, mappedDocuments, linkTypes, query);
      })
    );
  }

  public selectCollectionsInQuery$(): Observable<Collection[]> {
    return combineLatest([this.select$(selectCollectionsDictionary), this.select$(selectViewQuery)]).pipe(
      map(([collectionsMap, query]) => {
        const collectionIds = uniqueValues(query?.stems?.map(stem => stem.collectionId) || []);
        return collectionIds.map(id => collectionsMap[id]).filter(collection => !!collection);
      })
    );
  }

  public selectCollectionsByStems$(): Observable<Collection[]> {
    return combineLatest([
      this.select$(selectCollectionsDictionary),
      this.select$(selectAllLinkTypes),
      this.select$(selectViewQuery),
    ]).pipe(
      map(([collectionsMap, linkTypes, query]) => {
        const collectionIds = getAllCollectionIdsFromQuery(query, linkTypes);
        return collectionIds.map(id => collectionsMap[id]).filter(collection => !!collection);
      })
    );
  }

  public selectLinkTypesByReadPermission$(): Observable<LinkType[]> {
    return this.selectLinkTypesByPermission$(Role.Read);
  }

  public selectLinkTypesByWritePermission$(): Observable<LinkType[]> {
    return this.selectLinkTypesByPermission$(Role.Read);
  }

  private selectLinkTypesByPermission$(role: Role): Observable<LinkType[]> {
    return combineLatest([this.select$(selectLinkTypesPermissions), this.select$(selectAllLinkTypes)]).pipe(
      map(([permissions, linkTypes]) =>
        linkTypes.filter(linkType => hasRoleByPermissions(role, permissions[linkType.id]))
      )
    );
  }

  public selectLinkTypesInQuery$(): Observable<LinkType[]> {
    return combineLatest([this.selectLinkTypesByReadPermission$(), this.select$(selectViewQuery)]).pipe(
      map(([linkTypes, query]) => {
        const linkTypesIdsInQuery = getAllLinkTypeIdsFromQuery(query);
        return linkTypes.filter(linkType => linkTypesIdsInQuery.includes(linkType.id));
      })
    );
  }

  public selectLinkTypesByCollectionId$(collectionId: string): Observable<LinkType[]> {
    return this.selectLinkTypesByReadPermission$().pipe(
      map(linkTypes => linkTypes.filter(linkType => linkType.collectionIds.includes(collectionId)))
    );
  }

  public selectLinkTypeByIdWithCollections$(linkTypeId: string): Observable<LinkType> {
    return combineLatest([
      this.select$(selectLinkTypesDictionary),
      this.select$(selectCollectionsDictionary),
    ]).pipe(
      map(([linkTypesMap, collectionsMap]) => {
        const linkType = linkTypesMap[linkTypeId];
        return linkType ? mapLinkTypeCollections(linkType, collectionsMap) : linkType;
      })
    );
  }

  public selectDocumentsByReadPermission$(ids?: string[]): Observable<DocumentModel[]> {
    const idsSet = ids ? new Set(ids) : null;
    return combineLatest([this.select$(selectAllDocuments), this.selectCollectionsByReadPermission$()]).pipe(
      withLatestFrom(
        this.select$(selectCollectionsDictionary),
        this.select$(selectConstraintData)
      ),
      map(([[documents, collections], collectionsMap, constraintData]) => {
        const allowedCollectionIds = new Set(collections.map(collection => collection.id));
        return this.mapDocuments(
          documents,
          collectionsMap,
          constraintData,
          document => allowedCollectionIds.has(document.collectionId) && (!idsSet || idsSet.has(document.id))
        );
      })
    );
  }

  public selectDocumentsAndLinksByQuery$(): Observable<{ documents: DocumentModel[]; linkInstances: LinkInstance[] }> {
    return combineLatest([
      this.selectDocumentsByReadPermission$(),
      this.selectCollectionsByReadPermission$(),
      this.select$(selectAllLinkTypes),
      this.selectAllLinkInstances$(),
      this.select$(selectViewQuery),
      this.select$(selectResourcesPermissions),
    ]).pipe(
      map(([documents, collections, linkTypes, linkInstances, query, permissions]) =>
        filterDocumentsAndLinksByQuery(
          documents,
          collections,
          linkTypes,
          linkInstances,
          query,
          permissions.collections,
          permissions.linkTypes
        )
      )
    );
  }

  public selectDocumentsAndLinksByQuerySorted$(): Observable<{
    documents: DocumentModel[];
    linkInstances: LinkInstance[];
  }> {
    return this.selectDocumentsAndLinksByCustomQuerySorted$().pipe(
      tap(data => console.log(data))
    );
  }

  public selectDocumentsAndLinksByCustomQuerySorted$(
    inputQuery?: Query,
    includeChildren?: boolean
  ): Observable<{ documents: DocumentModel[]; linkInstances: LinkInstance[] }> {
    return combineLatest([
      this.selectDocumentsByReadPermission$(),
      this.selectCollectionsByReadPermission$(),
      this.select$(selectAllLinkTypes),
      this.selectAllLinkInstances$(),
      this.select$(selectViewQuery),
      combineLatest([this.select$(selectResourcesPermissions), this.select$(selectViewSettings)]),
    ]).pipe(
      map(([documents, collections, linkTypes, linkInstances, query, [permissions, viewSettings]]) => {
        const data = filterDocumentsAndLinksByQuery(
          documents,
          collections,
          linkTypes,
          linkInstances,
          inputQuery || query,
          permissions.collections,
          permissions.linkTypes,
          includeChildren
        );
        return {
          documents: sortDataResourcesByViewSettings(data.documents, AttributesResourceType.Collection, viewSettings),
          linkInstances: sortDataResourcesByViewSettings(
            data.linkInstances,
            AttributesResourceType.LinkType,
            viewSettings
          ),
        };
      })
    );
  }

  public selectDocumentsByQuery$(): Observable<DocumentModel[]> {
    return this.selectDocumentsAndLinksByQuery$().pipe(map(({documents}) => documents));
  }

  public selectDocumentsByQuerySorted$(): Observable<DocumentModel[]> {
    return combineLatest([this.selectDocumentsByQuery$(), this.select$(selectViewSettings)]).pipe(
      map(([documents, viewSettings]) =>
        sortDataResourcesByViewSettings(documents, AttributesResourceType.Collection, viewSettings)
      )
    );
  }

  public selectDocumentsByQueryIncludingChildren$(ids?: string[]): Observable<DocumentModel[]> {
    return combineLatest([
      this.selectDocumentsByReadPermission$(ids),
      this.selectCollectionsByReadPermission$(),
      this.select$(selectAllLinkTypes),
      this.selectAllLinkInstances$(),
      this.select$(selectViewQuery),
      this.select$(selectResourcesPermissions),
    ]).pipe(
      map(([documents, collections, linkTypes, linkInstances, query, permissions]) =>
        sortDocumentsByCreationDate(
          filterDocumentsAndLinksByQuery(
            documents,
            collections,
            linkTypes,
            linkInstances,
            query,
            permissions.collections,
            permissions.linkTypes,
            true
          ).documents
        )
      )
    );
  }

  public selectDocumentsAndLinksByCustomQuery$(
    query: Query,
    desc?: boolean,
    includeChildren?: boolean
  ): Observable<{ documents: DocumentModel[]; linkInstances: LinkInstance[] }> {
    return combineLatest([
      this.selectDocumentsByReadPermission$(),
      this.selectCollectionsByReadPermission$(),
      this.select$(selectAllLinkTypes),
      this.selectAllLinkInstances$(),
      this.select$(selectResourcesPermissions),
    ]).pipe(
      map(([documents, collections, linkTypes, linkInstances, permissions]) => {
        const data = filterDocumentsAndLinksByQuery(
          documents,
          collections,
          linkTypes,
          linkInstances,
          query,
          permissions.collections,
          permissions.linkTypes,
          includeChildren
        );
        return {
          documents: sortDocumentsByCreationDate(data.documents, desc),
          linkInstances: sortLinkInstances(data.linkInstances),
        };
      })
    );
  }

  public selectDocumentsByCustomQuery$(
    query: Query,
    desc?: boolean,
    includeChildren?: boolean
  ): Observable<DocumentModel[]> {
    return this.selectDocumentsAndLinksByCustomQuery$(query, desc, includeChildren).pipe(
      map(({documents}) => documents)
    );
  }

  private selectAllLinkInstances$(): Observable<LinkInstance[]> {
    return this.select$(selectAllLinkInstances).pipe(
      withLatestFrom(
        this.store$.pipe(select(selectLinkTypesDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([linkInstances, linkTypesMap, constraintData]) =>
        this.mapLinkInstances(linkInstances, linkTypesMap, constraintData)
      )
    );
  }

  public selectDocumentsByIds$(ids: string[]): Observable<DocumentModel[]> {
    return this.mapDocuments$(
      this.select$(selectDocumentsDictionary).pipe(
        map(documentsMap => (ids || []).map(id => documentsMap[id]).filter(doc => doc))
      )
    );
  }

  private mapDocuments$(observable$: Observable<DocumentModel[]>): Observable<DocumentModel[]> {
    return observable$.pipe(
      withLatestFrom(
        this.store$.pipe(select(selectCollectionsDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([documents, collectionsMap, constraintData]) => this.mapDocuments(documents, collectionsMap, constraintData))
    );
  }

  public selectDocumentById$(id: string): Observable<DocumentModel> {
    return this.select$(selectDocumentsDictionary).pipe(
      map(documentsMap => documentsMap[id]),
      withLatestFrom(
        this.store$.pipe(select(selectCollectionsDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([document, collectionsMap, constraintData]) => this.mapDocument(document, collectionsMap, constraintData))
    );
  }

  public selectDocumentsByCollectionId$(collectionId: string): Observable<DocumentModel[]> {
    return this.mapDocuments$(
      this.select$(selectAllDocuments).pipe(
        map(documents => documents.filter(doc => doc.collectionId === collectionId))
      )
    );
  }

  public selectLinkInstancesByIds$(ids: string[]): Observable<LinkInstance[]> {
    return this.mapLinkInstances$(
      this.select$(selectLinkInstancesDictionary).pipe(
        map(linkInstancesMap => (ids || []).map(id => linkInstancesMap[id]).filter(doc => doc))
      )
    );
  }

  public selectLinkInstanceById$(id: string): Observable<LinkInstance> {
    return this.select$(selectLinkInstancesDictionary).pipe(
      map(linkInstancesMap => linkInstancesMap[id]),
      withLatestFrom(
        this.store$.pipe(select(selectLinkTypesDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([linkInstance, collectionsMap, constraintData]) =>
        this.mapLinkInstance(linkInstance, collectionsMap, constraintData)
      )
    );
  }

  public selectLinkInstancesByLinkTypeId$(linkTypeId: string): Observable<LinkInstance[]> {
    return this.mapLinkInstances$(
      this.select$(selectAllLinkInstances).pipe(
        map(documents => documents.filter(doc => doc.linkTypeId === linkTypeId))
      )
    );
  }

  public selectLinkInstancesByDocumentIds$(documentIds: string[]): Observable<LinkInstance[]> {
    const documentIdsSet = new Set(documentIds);
    return this.mapLinkInstances$(
      combineLatest([this.select$(selectAllLinkInstances), this.select$(selectDocumentsDictionary)]).pipe(
        map(([linkInstances, documentsMap]) =>
          linkInstances.filter(linkInstance =>
            linkInstance.documentIds?.some(
              id => documentIdsSet.has(id) && isLinkInstanceValid(linkInstance, documentsMap)
            )
          )
        )
      )
    );
  }

  public selectLinkInstancesByTypeAndDocumentIds$(
    linkTypeId: string,
    documentIds: string[]
  ): Observable<LinkInstance[]> {
    const documentIdsSet = new Set(documentIds);
    return this.mapLinkInstances$(
      combineLatest([this.select$(selectAllLinkInstances), this.select$(selectDocumentsDictionary)]).pipe(
        map(([linkInstances, documentsMap]) =>
          linkInstances.filter(linkInstance =>
            linkInstance.documentIds?.some(
              id =>
                linkInstance.linkTypeId === linkTypeId &&
                documentIdsSet.has(id) &&
                isLinkInstanceValid(linkInstance, documentsMap)
            )
          )
        )
      )
    );
  }

  private mapLinkInstances$(observable$: Observable<LinkInstance[]>): Observable<LinkInstance[]> {
    return observable$.pipe(
      withLatestFrom(
        this.store$.pipe(select(selectLinkTypesDictionary)),
        this.store$.pipe(select(selectConstraintData))
      ),
      map(([linkInstances, collectionsMap, constraintData]) =>
        this.mapLinkInstances(linkInstances, collectionsMap, constraintData)
      )
    );
  }

  public select$<T>(selector: Selector<AppState, T>): Observable<T> {
    return this.store$.pipe(select(selector));
  }

  private mapDocuments(
    documents: DocumentModel[],
    collectionsMap: Record<string, Collection>,
    constraintData: ConstraintData,
    filter?: (DocumentModel) => boolean
  ): DocumentModel[] {
    return documents.reduce((array, document) => {
      if (!filter || filter(document)) {
        array.push(this.mapDocument(document, collectionsMap, constraintData));
      }
      return array;
    }, []);
  }

  private mapDocument(
    document: DocumentModel,
    collectionsMap: Record<string, Collection>,
    constraintData: ConstraintData
  ): DocumentModel {

    if (!this.documentsCache[document.collectionId]) {
      this.documentsCache[document.collectionId] = {};
    }
    if (!this.documentsCache[document.collectionId][document.id]) {
      this.documentsCache[document.collectionId][document.id] = convertDataToDataValues(
        document.data,
        collectionsMap[document.collectionId]?.attributes,
        constraintData
      );
    }
    return {...document, dataValues: this.documentsCache[document.collectionId][document.id]};
  }

  private mapLinkInstances(
    linkInstances: LinkInstance[],
    linkTypesMap: Record<string, LinkType>,
    constraintData: ConstraintData,
    filter?: (LinkInstance) => boolean
  ): LinkInstance[] {
    return linkInstances.reduce((array, linkInstance) => {
      if (!filter || filter(linkInstance)) {
        array.push(this.mapLinkInstance(linkInstance, linkTypesMap, constraintData));
      }
      return array;
    }, []);
  }

  private mapLinkInstance(
    linkInstance: LinkInstance,
    linkTypesMap: Record<string, LinkType>,
    constraintData: ConstraintData
  ): LinkInstance {
    if (!this.linksCache[linkInstance.linkTypeId]) {
      this.linksCache[linkInstance.linkTypeId] = {};
    }
    if (!this.linksCache[linkInstance.linkTypeId][linkInstance.id]) {
      this.linksCache[linkInstance.linkTypeId][linkInstance.id] = convertDataToDataValues(
        linkInstance.data,
        linkTypesMap[linkInstance.linkTypeId]?.attributes,
        constraintData
      );
    }
    return {...linkInstance, dataValues: this.linksCache[linkInstance.linkTypeId][linkInstance.id]};
  }
}
