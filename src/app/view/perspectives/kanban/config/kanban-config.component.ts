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

import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {Collection} from '../../../../core/store/collections/collection';
import {KanbanAggregation, KanbanConfig, KanbanStemConfig} from '../../../../core/store/kanbans/kanban';
import {DocumentModel} from '../../../../core/store/documents/document.model';
import {ConstraintData} from '../../../../core/model/data/constraint';
import {Query, QueryStem} from '../../../../core/store/navigation/query/query';
import {SelectItemWithConstraintFormatter} from '../../../../shared/select/select-constraint-item/select-item-with-constraint-formatter.service';
import {KanbanConverter} from '../util/kanban-converter';
import {
  checkOrTransformKanbanConfig,
  createDefaultKanbanStemConfig,
  isKanbanAggregationDefined,
} from '../util/kanban.util';
import {deepObjectCopy, deepObjectsEquals} from '../../../../shared/utils/common.utils';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {LinkInstance} from '../../../../core/store/link-instances/link.instance';
import {SliderItem} from '../../../../shared/slider/values/slider-item';
import {SizeType} from '../../../../shared/slider/size/size-type';
import {PostItLayoutType} from '../../../../shared/post-it/post-it-layout-type';

@Component({
  selector: 'kanban-config',
  templateUrl: './kanban-config.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanConfigComponent implements OnChanges {
  @Input()
  public collections: Collection[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public documents: DocumentModel[];

  @Input()
  public linkInstances: LinkInstance[];

  @Input()
  public config: KanbanConfig;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public query: Query;

  @Output()
  public configChange = new EventEmitter<KanbanConfig>();

  private readonly converter: KanbanConverter;

  public readonly defaultStemConfig = createDefaultKanbanStemConfig();
  public readonly cardLayoutSliderItems: SliderItem[] = [
    {id: PostItLayoutType.Quarter, title: '1:4'},
    {id: PostItLayoutType.Third, title: '1:3'},
    {id: PostItLayoutType.Half, title: '1:2'},
    {id: PostItLayoutType.Even, title: '1:1'},
  ];

  constructor(private constraintItemsFormatter: SelectItemWithConstraintFormatter) {
    this.converter = new KanbanConverter(constraintItemsFormatter);
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.documents || changes.collections || changes.linkTypes || changes.constraintData || changes.query) {
      this.checkConfigColumns();
    }
  }

  private checkConfigColumns() {
    const config = this.converter.buildKanbanConfig(
      checkOrTransformKanbanConfig(this.config, this.query, this.collections, this.linkTypes),
      this.collections,
      this.linkTypes,
      this.documents,
      this.linkInstances,
      this.constraintData
    );
    if (!deepObjectsEquals(config, this.config)) {
      setTimeout(() => this.configChange.emit(config));
    }
  }

  public trackByStem(index: number, stem: QueryStem): string {
    return stem.collectionId + index;
  }

  public onConfigChange(
    data: {config: KanbanStemConfig; shouldRebuildConfig: boolean},
    stem: QueryStem,
    index: number
  ) {
    const newConfig = deepObjectCopy<KanbanConfig>(this.config);
    newConfig.stemsConfigs[index] = {...data.config, stem};

    if (!isKanbanAggregationDefined(newConfig)) {
      delete newConfig.aggregation;
    }

    if (data.shouldRebuildConfig) {
      this.rebuildConfigChange(newConfig);
    } else {
      this.configChange.emit(newConfig);
    }
  }

  private rebuildConfigChange(newConfig: KanbanConfig) {
    const config = this.converter.buildKanbanConfig(
      newConfig,
      this.collections,
      this.linkTypes,
      this.documents,
      this.linkInstances,
      this.constraintData
    );
    this.configChange.emit(config);
  }

  public onColumnSizeChanged(sizeType: SizeType) {
    this.rebuildConfigChange({...this.config, columnSize: sizeType});
  }

  public onCardLayoutChanged(item: SliderItem) {
    this.configChange.emit({...this.config, cardLayout: item.id});
  }

  public onAggregationChanged(aggregation: KanbanAggregation) {
    this.configChange.emit({...this.config, aggregation});
  }
}
