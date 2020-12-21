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

import {ConstraintConditionValue} from './data/constraint-condition';

export interface AttributeFilterEquation {
  equations?: AttributeFilterEquation[];
  filter?: AttributeFilter;
  operator?: EquationOperator;
}

export enum EquationOperator {
  Or = 'or',
  And = 'and',
}

export interface AttributeFilter {
  condition: ConditionType;
  conditionValues: ConditionValue[];
  attributeId: string;
}

export enum ConditionType {
  Equals = 'eq',
  NotEquals = 'neq',
  LowerThan = 'lt',
  LowerThanEquals = 'lte',
  GreaterThan = 'gt',
  GreaterThanEquals = 'gte',
  In = 'in',
  HasSome = 'hasSome',
  HasAll = 'hasAll',
  HasNoneOf = 'nin',
  Between = 'between',
  NotBetween = 'notBetween',
  Contains = 'contains',
  NotContains = 'notContains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith',
  IsEmpty = 'empty',
  NotEmpty = 'notEmpty',
  Enabled = 'enabled',
  Disabled = 'disabled',
}

export interface ConditionValue {
  type?: ConstraintConditionValue;
  value?: any;
}
