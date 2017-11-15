/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Answer Institute, s.r.o. and/or its affiliates.
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
import {QueryItem} from './query-item';

import {Query} from '../../../core/dto/query';
import {CollectionQueryItem} from './collection-query-item';
import {AttributeQueryItem} from './attribute-query-item';
import {FulltextQueryItem} from './fulltext-query-item';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import {map} from 'rxjs/operators'
import {Collection} from '../../../core/dto/collection';
import {QueryConverter} from '../../utils/query-converter';
import {SearchService} from '../../../core/rest/search.service';
import {LinkQueryItem} from './link-query-item';
import {LinkTypeService} from '../../../core/rest/link-type.service';

@Injectable()
export class QueryItemsConverter {

  constructor(private searchService: SearchService,
              private linkTypeService: LinkTypeService) {
  }

  public toQueryString(queryItems: QueryItem[]): string {
    const query: Query = {
      collectionCodes: [],
      filters: [],
      linkIds: []
    };

    queryItems.forEach(queryItem => {
      if (queryItem instanceof CollectionQueryItem) {
        query.collectionCodes.push(queryItem.value);
      } else if (queryItem instanceof AttributeQueryItem) {
        query.filters.push(queryItem.value);
      } else if (queryItem instanceof FulltextQueryItem) {
        query.fulltext = queryItem.value;
      } else if (queryItem instanceof LinkQueryItem) {
        query.linkIds.push(queryItem.value);
      }
    });

    return QueryConverter.toString(query);
  }

  public fromQuery(query: Query): Observable<QueryItem[]> {
    return this.loadNeededCollections(query).pipe(
      map((collections: Collection[]) => QueryItemsConverter.convertToCollectionsMap(collections)),
      map(collectionsMap => this.createQueryItems(collectionsMap, query))
    );
  }

  private loadNeededCollections(query: Query): Observable<Collection[]> {
    let collectionCodes = query.filters.map(filter => filter.split(':')[0]);
    collectionCodes = collectionCodes.concat(query.collectionCodes);

    query.linkIds.forEach(id => {
      const linkType = this.linkTypeService.getLinkTypeById(id);
      if (!collectionCodes.includes(linkType.collectionCodes[0])) {
        collectionCodes.push(linkType.collectionCodes[0]);
      }
      if (!collectionCodes.includes(linkType.collectionCodes[1])) {
        collectionCodes.push(linkType.collectionCodes[1]);
      }
    });

    if (collectionCodes) {
      return this.searchService.searchCollections({
        collectionCodes: collectionCodes
      });
    }

    return Observable.of<Collection[]>([]);
  }

  private static convertToCollectionsMap(collections: Collection[]): { [key: string]: Collection } {
    let collectionsMap: { [key: string]: Collection } = {};
    collections.forEach(collection => collectionsMap[collection.code] = collection);
    return collectionsMap;
  }

  private createQueryItems(collectionsMap: { [key: string]: Collection }, query: Query): QueryItem[] {
    let collectionItems: QueryItem[] = QueryItemsConverter.createCollectionQueryItems(collectionsMap, query);
    let attributeItems: QueryItem[] = QueryItemsConverter.createAttributeQueryItems(collectionsMap, query);

    let queryItems: QueryItem[] = [];
    for (let collItem of collectionItems) {
      queryItems.push(collItem);
      for (let attrItem of attributeItems) {
        if (attrItem.value.startsWith(collItem.value)) {
          queryItems.push(attrItem);
        }
      }
    }
    queryItems = queryItems.concat(this.createLinkQueryItems(collectionsMap, query));

    if (query.fulltext) {
      queryItems.push(new FulltextQueryItem(query.fulltext));
    }
    return queryItems;
  }

  private createLinkQueryItems(collectionsMap: { [key: string]: Collection }, query: Query): QueryItem[] {
    const items = [];
    query.linkIds.forEach(id => {
      const linkType = this.linkTypeService.getLinkTypeById(id);
      const coll1 = collectionsMap[linkType.collectionCodes[0]];
      const coll2 = collectionsMap[linkType.collectionCodes[1]];
      if (coll1 && coll2) {
        items.push(new LinkQueryItem(linkType, coll1, coll2));
      }
    });
    return items;
  }

  private static createCollectionQueryItems(collectionsMap: { [key: string]: Collection }, query: Query): QueryItem[] {
    return query.collectionCodes.map(collectionCode => {
      let collection = collectionsMap[collectionCode];
      if (collection) {
        return new CollectionQueryItem(collection);
      }
    });
  }

  private static createAttributeQueryItems(collectionsMap: { [key: string]: Collection }, query: Query): QueryItem[] {
    return query.filters.map(filter => {
      let filterParts = filter.split(':', 3);
      let collectionCode = filterParts[0];
      let attribute = filterParts[1];
      let condition = filterParts[2];

      let collection: Collection = collectionsMap[collectionCode];
      if (collection && attribute && condition) {
        collection.attributes = [{name: attribute, fullName: attribute, constraints: [], usageCount: 0}];
        let queryItem = new AttributeQueryItem(collection);
        queryItem.condition = condition;
        return queryItem;
      }
    });
  }

}
