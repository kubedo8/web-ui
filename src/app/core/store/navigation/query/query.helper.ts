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

import {deepArrayEquals, getArrayDifference, isArraySubset} from '../../../../shared/utils/array.utils';
import {convertQueryModelToString, normalizeQueryModel} from './query.converter';
import {Query} from './query';
import {getBaseCollectionIdsFromQuery, queryWithoutFilters} from './query.util';
import {deepObjectsEquals} from '../../../../shared/utils/common.utils';

export function areQueriesEqual(first: Query, second: Query): boolean {
  return deepObjectsEquals(normalizeQueryModel(first), normalizeQueryModel(second));
}

export function areQueriesEqualExceptFilters(first: Query, second: Query): boolean {
  const firstWithoutPagination = queryWithoutFilters({...first});
  const secondWithoutPagination = queryWithoutFilters({...second});
  return convertQueryModelToString(firstWithoutPagination) === convertQueryModelToString(secondWithoutPagination);
}

export function hasQueryNewLink(oldQuery: Query, newQuery: Query) {
  if (
    oldQuery.stems.length !== newQuery.stems.length ||
    !deepArrayEquals(getBaseCollectionIdsFromQuery(oldQuery), getBaseCollectionIdsFromQuery(newQuery))
  ) {
    return false;
  }

  const newQueryLinkTypeIds = (newQuery.stems[0] && newQuery.stems[0].linkTypeIds) || [];
  const oldQueryLinkTypeIds = (oldQuery.stems[0] && oldQuery.stems[0].linkTypeIds) || [];

  return (
    newQueryLinkTypeIds.length > oldQueryLinkTypeIds.length && isArraySubset(newQueryLinkTypeIds, oldQueryLinkTypeIds)
  );
}

export function getNewLinkTypeIdFromQuery(oldQuery: Query, newQuery: Query): string {
  const newQueryLinkTypeIds = (newQuery.stems[0] && newQuery.stems[0].linkTypeIds) || [];
  const oldQueryLinkTypeIds = (oldQuery.stems[0] && oldQuery.stems[0].linkTypeIds) || [];

  const linkTypeIds = getArrayDifference(newQueryLinkTypeIds, oldQueryLinkTypeIds);
  if (linkTypeIds.length !== 1) {
    throw Error('No new link type IDs');
  }
  return linkTypeIds[0];
}
