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

import {AttributeModel, CollectionModel} from '../../../../../core/store/collections/collection.model';
import {QueryItem} from './query-item';
import {QueryItemType} from './query-item-type';
import {CollectionQueryItem} from './collection.query-item';
import {AttributeFilterModel} from '../../../../../core/store/navigation/query.model';
import {conditionFromString} from '../../../../../core/store/navigation/query.util';

export class AttributeQueryItem implements QueryItem {
  public type = QueryItemType.Attribute;

  public constructor(
    public collection: CollectionModel,
    public attribute: AttributeModel,
    public condition: string,
    public value: string
  ) {}

  public get text() {
    return this.attribute.name;
  }

  public get value() {
    return this.getFilter();
  }

  public get icons(): string[] {
    return [this.collection.icon];
  }

  public get colors(): string[] {
    return [this.collection.color];
  }

  public getFilter(): string {
    return `${this.collection.id}:${this.attribute.id}:${this.condition} ${this.value}`;
  }

  public getAttributeFilter(): AttributeFilterModel {
    return {
      collectionId: this.collection.id,
      attributeId: this.attribute.id,
      condition: this.condition,
      conditionType: conditionFromString(this.condition),
      value: this.value,
    };
  }

  public dependsOn(queryItem: QueryItem): boolean {
    if (queryItem.type === QueryItemType.Collection) {
      return (queryItem as CollectionQueryItem).collection.id === this.collection.id;
    }
    return false;
  }
}
