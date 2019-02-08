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

import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {Collection} from '../../../core/store/collections/collection';
import {
  selectCollectionsByCustomQuery,
  selectDocumentsByCustomQuery,
} from '../../../core/store/common/permissions.selectors';
import {DocumentModel} from '../../../core/store/documents/document.model';
import {selectQuery} from '../../../core/store/navigation/navigation.state';
import {Query} from '../../../core/store/navigation/query';
import {selectCurrentView} from '../../../core/store/views/views.state';
import {distinctUntilChanged, map, mergeMap, withLatestFrom} from 'rxjs/operators';

import {View, ViewConfig} from '../../../core/store/views/view';
import {AppState} from '../../../core/store/app.state';
import {DocumentsAction} from '../../../core/store/documents/documents.action';
import {DEFAULT_GANTT_CHART_ID, GanttChartConfig, GanttChartMode} from '../../../core/store/gantt-charts/gantt-chart';
import {selectGanttChartById, selectGanttChartConfig} from '../../../core/store/gantt-charts/gantt-charts.state';
import {GanttChartAction} from '../../../core/store/gantt-charts/gantt-charts.action';
import {queryWithoutLinks} from '../../../core/store/navigation/query.util';
import {AllowedPermissions} from '../../../core/model/allowed-permissions';
import {deepObjectsEquals} from '../../../shared/utils/common.utils';
import {CollectionsPermissionsPipe} from '../../../shared/pipes/permissions/collections-permissions.pipe';

@Component({
  selector: 'gantt-chart-perspective',
  templateUrl: './gantt-chart-perspective.component.html',
  styleUrls: ['./gantt-chart-perspective.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttChartPerspectiveComponent implements OnInit, OnDestroy {
  public documents$: Observable<DocumentModel[]>;
  public collections$: Observable<Collection[]>;
  public config$: Observable<GanttChartConfig>;
  public currentView$: Observable<View>;
  public permissions$: Observable<Record<string, AllowedPermissions>>;

  public query$ = new BehaviorSubject<Query>(null);

  private ganttChartId = DEFAULT_GANTT_CHART_ID;
  private subscriptions = new Subscription();

  constructor(private store$: Store<AppState>, private collectionsPermissionsPipe: CollectionsPermissionsPipe) {}

  public ngOnInit() {
    this.initGanttChart();
    this.subscribeToQuery();
    this.subscribeData();
  }

  private initGanttChart() {
    const subscription = this.store$
      .pipe(
        select(selectCurrentView),
        withLatestFrom(this.store$.pipe(select(selectGanttChartById(this.ganttChartId))))
      )
      .subscribe(([view, ganttChart]) => {
        if (ganttChart) {
          this.refreshGanttChart(view && view.config);
        } else {
          this.createGanttChart(view && view.config);
        }
      });
    this.subscriptions.add(subscription);
  }

  private refreshGanttChart(viewConfig: ViewConfig) {
    if (viewConfig && viewConfig.ganttChart) {
      this.store$.dispatch(
        new GanttChartAction.SetConfig({ganttChartId: this.ganttChartId, config: viewConfig.ganttChart})
      );
    }
  }

  private createGanttChart(viewConfig: ViewConfig) {
    const config = (viewConfig && viewConfig.ganttChart) || this.createDefaultConfig();
    const ganttChart = {id: this.ganttChartId, config};
    this.store$.dispatch(new GanttChartAction.AddGanttChart({ganttChart}));
  }

  private createDefaultConfig(): GanttChartConfig {
    return {mode: GanttChartMode.Day, collections: {}};
  }

  private subscribeToQuery() {
    const subscription = this.store$
      .pipe(
        select(selectQuery),
        map(query => query && queryWithoutLinks(query))
      )
      .subscribe(query => {
        this.fetchDocuments(query);
        this.query$.next(query);
        this.documents$ = this.store$.pipe(select(selectDocumentsByCustomQuery(query)));
        this.collections$ = this.store$.pipe(select(selectCollectionsByCustomQuery(query)));
      });
    this.subscriptions.add(subscription);
  }

  private fetchDocuments(query: Query) {
    this.store$.dispatch(new DocumentsAction.Get({query}));
  }

  private subscribeData() {
    this.config$ = this.store$.pipe(select(selectGanttChartConfig));
    this.currentView$ = this.store$.pipe(select(selectCurrentView));
    this.permissions$ = this.collections$.pipe(
      mergeMap(collections => this.collectionsPermissionsPipe.transform(collections)),
      distinctUntilChanged((x, y) => deepObjectsEquals(x, y))
    );
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.store$.dispatch(new GanttChartAction.RemoveGanttChart({ganttChartId: this.ganttChartId}));
  }

  public onConfigChanged(config: GanttChartConfig) {
    this.store$.dispatch(new GanttChartAction.SetConfig({ganttChartId: this.ganttChartId, config}));
  }

  public patchDocumentData(document: DocumentModel) {
    this.store$.dispatch(new DocumentsAction.PatchData({document}));
  }
}
