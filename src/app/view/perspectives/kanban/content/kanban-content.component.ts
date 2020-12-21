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

import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  SimpleChange,
  OnDestroy,
} from '@angular/core';
import {Collection} from '../../../../core/store/collections/collection';
import {KanbanColumn, KanbanConfig} from '../../../../core/store/kanbans/kanban';
import {DocumentModel} from '../../../../core/store/documents/document.model';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {LinkInstance} from '../../../../core/store/link-instances/link.instance';
import {Query} from '../../../../core/store/navigation/query/query';
import {ConstraintData} from '../../../../core/model/data/constraint';
import {Workspace} from '../../../../core/store/navigation/workspace';
import {SelectItemWithConstraintFormatter} from '../../../../shared/select/select-constraint-item/select-item-with-constraint-formatter.service';
import {KanbanConverter} from '../util/kanban-converter';
import {BehaviorSubject, Subscription} from 'rxjs';
import {AppState} from '../../../../core/store/app.state';
import {select, Store} from '@ngrx/store';
import {ViewsAction} from '../../../../core/store/views/views.action';
import {selectCurrentView, selectSidebarOpened} from '../../../../core/store/views/views.state';
import {debounceTime, filter, map, take, withLatestFrom} from 'rxjs/operators';
import {View} from '../../../../core/store/views/view';
import {checkOrTransformKanbanConfig, isKanbanConfigChanged} from '../util/kanban.util';
import {KanbanData, KanbanDataColumn} from '../util/kanban-data';
import {AllowedPermissions} from '../../../../core/model/allowed-permissions';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {DocumentsAction} from '../../../../core/store/documents/documents.action';
import {LinkInstancesAction} from '../../../../core/store/link-instances/link-instances.action';

interface Data {
  collections: Collection[];
  documents: DocumentModel[];
  linkTypes: LinkType[];
  linkInstances: LinkInstance[];
  config: KanbanConfig;
  constraintData: ConstraintData;
  permissions: Record<string, AllowedPermissions>;
  query: Query;
}

@Component({
  selector: 'kanban-content',
  templateUrl: './kanban-content.component.html',
  styleUrls: ['./kanban-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanContentComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  public collections: Collection[];

  @Input()
  public config: KanbanConfig;

  @Input()
  public documents: DocumentModel[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public linkInstances: LinkInstance[];

  @Input()
  public canManageConfig: boolean;

  @Input()
  public query: Query;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public workspace: Workspace;

  @Input()
  public permissions: Record<string, AllowedPermissions>;

  @Input()
  public linkTypesPermissions: Record<string, AllowedPermissions>;

  @Output()
  public configChange = new EventEmitter<KanbanConfig>();

  private readonly converter: KanbanConverter;

  public sidebarOpened$ = new BehaviorSubject(false);
  public data$ = new BehaviorSubject<KanbanData>(null);

  private dataSubject = new BehaviorSubject<Data>(null);
  private subscriptions = new Subscription();
  private currentConfig: KanbanConfig;

  constructor(private store$: Store<AppState>, private constraintItemsFormatter: SelectItemWithConstraintFormatter) {
    this.converter = new KanbanConverter(constraintItemsFormatter);
  }

  public ngOnInit() {
    this.setupSidebar();
    this.subscribeData();
  }

  private subscribeData() {
    const subscription = this.dataSubject
      .pipe(
        filter(data => !!data),
        debounceTime(100),
        map(data => this.handleData(data))
      )
      .subscribe(data => {
        this.currentConfig = data.config;
        this.configChange.emit(data.config);
        this.data$.next(data.data);
      });

    this.subscriptions.add(subscription);
  }

  private handleData(data: Data): {config: KanbanConfig; data: KanbanData} {
    const transformedConfig = checkOrTransformKanbanConfig(data.config, data.query, data.collections, data.linkTypes);

    return this.converter.convert(
      transformedConfig,
      data.collections,
      data.linkTypes,
      data.documents,
      data.linkInstances,
      data.permissions,
      data.constraintData
    );
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (this.shouldConvertData(changes)) {
      this.rebuildConfig(this.config);
    }
  }

  private shouldConvertData(changes: SimpleChanges): boolean {
    return (
      (changes.documents ||
        (changes.config && this.configChanged(changes.config)) ||
        changes.collections ||
        changes.linkTypes ||
        changes.query ||
        changes.permissions ||
        changes.linkInstances ||
        changes.constraintData) &&
      !!this.config
    );
  }

  private configChanged(change: SimpleChange): boolean {
    return change.currentValue && isKanbanConfigChanged(this.currentConfig, change.currentValue);
  }

  public onConfigChanged(config: KanbanConfig, rebuild = false) {
    if (rebuild) {
      this.rebuildConfig(config);
    } else {
      this.currentConfig = config;
      this.configChange.emit(config);
    }
  }

  private rebuildConfig(config: KanbanConfig) {
    this.dataSubject.next({
      config,
      collections: this.collections,
      documents: this.documents,
      linkTypes: this.linkTypes,
      linkInstances: this.linkInstances,
      query: this.query,
      constraintData: this.constraintData,
      permissions: this.permissions,
    });
  }

  private setupSidebar() {
    this.store$
      .pipe(select(selectCurrentView), withLatestFrom(this.store$.pipe(select(selectSidebarOpened))), take(1))
      .subscribe(([currentView, sidebarOpened]) => this.openOrCloseSidebar(currentView, sidebarOpened));
  }

  private openOrCloseSidebar(view: View, opened: boolean) {
    if (view) {
      this.sidebarOpened$.next(opened);
    } else {
      this.sidebarOpened$.next(true);
    }
  }

  public onSidebarToggle() {
    const opened = !this.sidebarOpened$.getValue();
    this.store$.dispatch(new ViewsAction.SetSidebarOpened({opened}));
    this.sidebarOpened$.next(opened);
  }

  public onColumnMoved(event: {previousIndex: number; currentIndex: number}) {
    this.handleDataColumnsMove(event);
    this.handleConfigColumnsMove(event);
  }

  private handleDataColumnsMove(event: {previousIndex: number; currentIndex: number}) {
    const columns = [...this.data$.value.columns];
    moveItemInArray(columns, event.previousIndex, event.currentIndex);
    this.data$.next({...this.data$.value, columns});
  }

  private handleConfigColumnsMove(event: {previousIndex: number; currentIndex: number}) {
    const columns = [...this.config.columns];
    moveItemInArray(columns, event.previousIndex, event.currentIndex);
    this.onConfigChanged({...this.config, columns});
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public onColumnRemove(column: KanbanColumn) {
    this.handleDataColumnRemove(column);
    this.handleConfigColumnRemove(column);
  }

  private handleDataColumnRemove(column: KanbanColumn) {
    const filteredColumns = (this.data$.value.columns || []).filter(col => col.id !== column.id);
    const newData = {...this.data$.value, columns: filteredColumns};
    this.data$.next(newData);
  }

  private handleConfigColumnRemove(column: KanbanColumn) {
    const filteredColumns = (this.config.columns || []).filter(col => col.id !== column.id);
    const config = {...this.config, columns: filteredColumns};
    this.onConfigChanged(config);
  }

  public onColumnsChanged(data: {columns: KanbanDataColumn[]; otherColumn: KanbanDataColumn}) {
    this.data$.next({...this.data$.value, ...data});
  }

  public patchDocumentData(document: DocumentModel) {
    this.store$.dispatch(new DocumentsAction.PatchData({document}));
  }

  public patchLinkInstanceData(linkInstance: LinkInstance) {
    this.store$.dispatch(new LinkInstancesAction.PatchData({linkInstance}));
  }

  public updateLinkDocuments(payload: {linkInstanceId: string; documentIds: [string, string]}) {
    this.store$.dispatch(new LinkInstancesAction.ChangeDocuments(payload));
  }
}
