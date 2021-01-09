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
import {createSelector} from '@ngrx/store';
import {isArraySubset, uniqueValues} from '../../../shared/utils/array.utils';
import {hasRoleByPermissions, sortResourcesByFavoriteAndLastUsed} from '../../../shared/utils/resource.utils';
import {Role} from '../../model/role';
import {filterCollectionsByQuery} from '../collections/collections.filters';
import {selectAllCollections, selectCollectionsDictionary} from '../collections/collections.state';
import {DocumentModel} from '../documents/document.model';
import {sortDocumentsByCreationDate} from '../documents/document.utils';
import {filterDocumentsAndLinksByQuery} from '../documents/documents.filters';
import {selectAllDocuments} from '../documents/documents.state';
import {selectAllLinkInstances} from '../link-instances/link-instances.state';
import {selectAllLinkTypes} from '../link-types/link-types.state';
import {Query} from '../navigation/query/query';
import {
  getAllCollectionIdsFromQuery,
  getAllLinkTypeIdsFromQuery,
  queryWithoutLinks,
} from '../navigation/query/query.util';
import {View} from '../views/view';
import {filterViewsByQuery} from '../views/view.filters';
import {selectAllViews, selectCurrentView, selectViewQuery} from '../views/views.state';
import {LinkInstance} from '../link-instances/link.instance';
import {selectViewSettings} from '../view-settings/view-settings.state';
import {AttributesResourceType} from '../../model/resource';
import {sortDataResourcesByViewSettings} from '../../../shared/utils/data-resource.utils';
import {sortLinkInstances} from '../link-instances/link-instance.utils';
import {
  selectCollectionsPermissions,
  selectResourcesPermissions,
  selectViewsPermissions,
} from '../user-permissions/user-permissions.state';

const selectCollectionsByPermission = (role: Role) =>
  createSelector(selectCollectionsPermissions, selectAllCollections, (permissions, collections) =>
    collections.filter(collection => hasRoleByPermissions(role, permissions[collection.id]))
  );

export const selectCollectionsByReadPermission = selectCollectionsByPermission(Role.Read);

export const selectCollectionsByWritePermission = selectCollectionsByPermission(Role.Write);

export const selectCollectionsByQuery = createSelector(
  selectCollectionsByReadPermission,
  selectAllDocuments,
  selectAllLinkTypes,
  selectViewQuery,
  (collections, documents, linkTypes, query) => filterCollectionsByQuery(collections, documents, linkTypes, query)
);

export const selectCollectionsByQueryWithoutLinks = createSelector(
  selectCollectionsByReadPermission,
  selectAllDocuments,
  selectAllLinkTypes,
  selectViewQuery,
  (collections, documents, linkTypes, query) =>
    filterCollectionsByQuery(collections, documents, linkTypes, queryWithoutLinks(query))
);

export const selectCollectionsInQuery = createSelector(
  selectCollectionsDictionary,
  selectViewQuery,
  (collectionsMap, query) => {
    const collectionIds = uniqueValues(query?.stems?.map(stem => stem.collectionId) || []);
    return collectionIds.map(id => collectionsMap[id]).filter(collection => !!collection);
  }
);

export const selectCollectionsByStems = createSelector(
  selectCollectionsDictionary,
  selectAllLinkTypes,
  selectViewQuery,
  (collectionsMap, linkTypes, query) => {
    const collectionIds = getAllCollectionIdsFromQuery(query, linkTypes);
    return collectionIds.map(id => collectionsMap[id]).filter(collection => !!collection);
  }
);

export const selectCollectionsByCustomQuery = (query: Query) =>
  createSelector(
    selectCollectionsByReadPermission,
    selectAllDocuments,
    selectAllLinkTypes,
    (collections, documents, linkTypes) => filterCollectionsByQuery(collections, documents, linkTypes, query)
  );

export const selectDocumentsByReadPermission = createSelector(
  selectAllDocuments,
  selectCollectionsByReadPermission,
  (documents, collections) => {
    const allowedCollectionIds = collections.map(collection => collection.id);
    return documents.filter(document => allowedCollectionIds.includes(document.collectionId));
  }
);

export const selectDocumentsAndLinksByQuery = createSelector(
  selectDocumentsByReadPermission,
  selectCollectionsByReadPermission,
  selectAllLinkTypes,
  selectAllLinkInstances,
  selectViewQuery,
  selectViewSettings,
  selectResourcesPermissions,
  (
    documents,
    collections,
    linkTypes,
    linkInstances,
    query,
    viewSettings,
    permissions
  ): {documents: DocumentModel[]; linkInstances: LinkInstance[]} =>
    filterDocumentsAndLinksByQuery(
      documents,
      collections,
      linkTypes,
      linkInstances,
      query,
      permissions.collections,
      permissions.linkTypes
    )
);

export const selectDocumentsAndLinksByCustomQuerySorted = (inputQuery?: Query, includeChildren?: boolean) =>
  createSelector(
    selectDocumentsByReadPermission,
    selectCollectionsByReadPermission,
    selectAllLinkTypes,
    selectAllLinkInstances,
    selectViewQuery,
    selectViewSettings,
    selectResourcesPermissions,
    (
      documents,
      collections,
      linkTypes,
      linkInstances,
      query,
      viewSettings,
      permissions
    ): {documents: DocumentModel[]; linkInstances: LinkInstance[]} => {
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
    }
  );

export const selectDocumentsAndLinksByQuerySorted = selectDocumentsAndLinksByCustomQuerySorted();

export const selectDocumentsByQuery = createSelector(
  selectDocumentsAndLinksByQuery,
  (data): DocumentModel[] => data.documents
);

export const selectDocumentsByQuerySorted = createSelector(
  selectDocumentsByQuery,
  selectViewSettings,
  (documents, viewSettings) =>
    sortDataResourcesByViewSettings(documents, AttributesResourceType.Collection, viewSettings)
);

export const selectDocumentsByQueryIncludingChildren = createSelector(
  selectDocumentsByReadPermission,
  selectCollectionsByReadPermission,
  selectAllLinkTypes,
  selectAllLinkInstances,
  selectViewQuery,
  selectResourcesPermissions,
  (documents, collections, linkTypes, linkInstances, query, permissions): DocumentModel[] =>
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
);

export const selectDocumentsByQueryIncludingChildrenAndIds = (ids: string[]) =>
  createSelector(selectDocumentsByQueryIncludingChildren, documents => documents.filter(doc => ids.includes(doc.id)));

export const selectDocumentsAndLinksByCustomQuery = (query: Query, desc?: boolean, includeChildren?: boolean) =>
  createSelector(
    selectDocumentsByReadPermission,
    selectCollectionsByReadPermission,
    selectAllLinkTypes,
    selectAllLinkInstances,
    selectResourcesPermissions,
    (documents, collections, linkTypes, linkInstances, permissions) => {
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
    }
  );

export const selectDocumentsByCustomQuery = (query: Query, desc?: boolean, includeChildren?: boolean) =>
  createSelector(selectDocumentsAndLinksByCustomQuery(query, desc, includeChildren), data => data.documents);

export const selectLinkTypesByReadPermission = createSelector(
  selectAllLinkTypes,
  selectCollectionsByReadPermission,
  (linkTypes, collections) => {
    const allowedCollectionIds = collections.map(collection => collection.id);
    return linkTypes.filter(linkType => isArraySubset(allowedCollectionIds, linkType.collectionIds));
  }
);

export const selectLinkTypesByWritePermission = createSelector(
  selectAllLinkTypes,
  selectCollectionsByWritePermission,
  (linkTypes, collections) => {
    const allowedCollectionIds = collections.map(collection => collection.id);
    return linkTypes.filter(linkType => isArraySubset(allowedCollectionIds, linkType.collectionIds));
  }
);

export const selectLinkTypesInQuery = createSelector(
  selectLinkTypesByReadPermission,
  selectViewQuery,
  (linkTypes, query) => {
    const linkTypesIdsInQuery = getAllLinkTypeIdsFromQuery(query);
    return linkTypes.filter(linkType => linkTypesIdsInQuery.includes(linkType.id));
  }
);

export const selectLinkTypesByCollectionId = (collectionId: string) =>
  createSelector(selectLinkTypesByReadPermission, linkTypes =>
    linkTypes.filter(linkType => linkType.collectionIds.includes(collectionId))
  );

export const selectCanManageViewConfig = createSelector(
  selectCurrentView,
  selectViewsPermissions,
  (view, permissions) => !view || permissions?.[view.id]?.manage
);

export const selectViewsByRead = createSelector(selectAllViews, selectViewsPermissions, (views, permissions) =>
  views.filter(view => permissions?.[view.id]?.read)
);

export const selectViewsByReadSorted = createSelector(selectViewsByRead, (views): View[] =>
  sortResourcesByFavoriteAndLastUsed<View>(views)
);

export const selectViewsByQuery = createSelector(selectViewsByRead, selectViewQuery, (views, query): View[] =>
  sortResourcesByFavoriteAndLastUsed<View>(filterViewsByQuery(views, query))
);
