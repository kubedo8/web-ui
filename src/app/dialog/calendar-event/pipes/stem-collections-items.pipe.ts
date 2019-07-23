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

import {Pipe, PipeTransform} from '@angular/core';
import {Query} from '../../../core/store/navigation/query';
import {Collection} from '../../../core/store/collections/collection';
import {SelectItemModel} from '../../../shared/select/select-item/select-item.model';
import {isNotNullOrUndefined} from '../../../shared/utils/common.utils';

@Pipe({
  name: 'stemCollectionsItems',
})
export class StemCollectionsItemsPipe implements PipeTransform {
  public transform(query: Query, collections: Collection[], stemIndex: number): SelectItemModel[] {
    return (query.stems || []).reduce((models, stem, index) => {
      if (isNotNullOrUndefined(stemIndex) && index !== stemIndex) {
        return models;
      }

      const collection = (collections || []).find(coll => coll.id === stem.collectionId);
      if (collection) {
        models.push(this.collectionSelectItem(index, collection));
      }
      return models;
    }, []);
  }

  private collectionSelectItem(index: number, collection: Collection): SelectItemModel {
    return {id: index, value: collection.name, icons: [collection.icon], iconColors: [collection.color]};
  }
}
