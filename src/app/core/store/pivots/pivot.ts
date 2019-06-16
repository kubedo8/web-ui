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

import {AttributesResourceType} from '../../model/resource';
import {DataAggregationType} from '../../../shared/utils/data/data-aggregation';

export const DEFAULT_PIVOT_ID = 'default';

export interface Pivot {
  id: string;
  config?: PivotConfig;
}

export interface PivotConfig {
  rowAttributes: PivotRowAttribute[];
  columnAttributes: PivotColumnAttribute[];
  valueAttributes: PivotValueAttribute[];
}

export interface PivotAttribute {
  resourceId: string;
  attributeId: string;
  resourceIndex?: number;
  resourceType: AttributesResourceType;
}

export interface PivotRowColumnAttribute extends PivotAttribute {
  showSums?: boolean;
  sort?: PivotSort;
}

export interface PivotRowAttribute extends PivotRowColumnAttribute {}

export interface PivotColumnAttribute extends PivotRowColumnAttribute {}

export interface PivotSortValue {
  title: string;
  isSummary?: boolean;
}

export interface PivotSortList {
  valueTitle: string;
  values: PivotSortValue[];
}

export interface PivotSort {
  attribute?: PivotAttribute;
  list?: PivotSortList;
  asc: boolean;
}

export interface PivotValueAttribute extends PivotAttribute {
  aggregation: DataAggregationType;
}
