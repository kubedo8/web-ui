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

import {ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {select, Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators';
import {Collection} from '../../../core/store/collections/collection';
import {
  selectCollectionsInQuery,
  selectDocumentsByQuery
} from '../../../core/store/common/permissions.selectors';
import {DocumentModel} from '../../../core/store/documents/document.model';
import {formatMapCoordinates} from '../../../core/store/maps/map-coordinates';
import {
  DEFAULT_MAP_CONFIG,
  MapConfig,
  MapModel,
  MapPosition
} from '../../../core/store/maps/map.model';
import {MapsAction} from '../../../core/store/maps/maps.action';
import {DEFAULT_MAP_ID, selectMap, selectMapById, selectMapConfig,} from '../../../core/store/maps/maps.state';
import {selectMapPosition, selectQuery} from '../../../core/store/navigation/navigation.state';
import {Query} from '../../../core/store/navigation/query/query';
import {DefaultViewConfig, View, ViewConfig} from '../../../core/store/views/view';
import {ViewsAction} from '../../../core/store/views/views.action';
import {
  selectCurrentView,
  selectDefaultViewConfig,
  selectSidebarOpened,
} from '../../../core/store/views/views.state';
import {MapContentComponent} from './content/map-content.component';
import {DocumentsAction} from '../../../core/store/documents/documents.action';
import {preferViewConfigUpdate} from '../../../core/store/views/view.utils';
import {Perspective} from '../perspective';
import {filterLocationAttributes} from '../../../core/store/maps/map-config.utils';
import {getBaseCollectionIdsFromQuery} from '../../../core/store/navigation/query/query.util';
import {deepObjectsEquals} from '../../../shared/utils/common.utils';

@Component({
  selector: 'map-perspective',
  templateUrl: './map-perspective.component.html',
  styleUrls: ['./map-perspective.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPerspectiveComponent implements OnInit, OnDestroy {
  @Input()
  public query: Query;

  @ViewChild(MapContentComponent, {static: false})
  public mapContentComponent: MapContentComponent;

  public collections$: Observable<Collection[]>;
  public documents$: Observable<DocumentModel[]>;
  public map$: Observable<MapModel>;
  public query$: Observable<Query>;
  public sidebarOpened$ = new BehaviorSubject(false);

  private subscriptions = new Subscription();

  constructor(private activatedRoute: ActivatedRoute, private router: Router, private store$: Store<{}>) {
  }

  public ngOnInit() {
    this.query$ = this.store$.pipe(select(selectQuery));
    this.collections$ = this.store$.pipe(select(selectCollectionsInQuery));
    this.documents$ = this.store$.pipe(select(selectDocumentsByQuery));
    this.map$ = this.store$.pipe(select(selectMap));

    this.subscriptions.add(this.subscribeToConfig());
    this.subscriptions.add(this.subscribeToMapConfigPosition());
    this.subscriptions.add(this.subscribeToMapConfig());

    this.setupSidebar();
    this.subscribeToQuery();
  }

  private subscribeToQuery() {
    const subscription = this.store$.pipe(select(selectQuery)).subscribe(query => {
      this.fetchDocuments(query);
    });
    this.subscriptions.add(subscription);
  }

  private fetchDocuments(query: Query) {
    this.store$.dispatch(new DocumentsAction.Get({query}));
  }

  private subscribeToConfig(): Subscription {
    return this.store$
      .pipe(
        select(selectCurrentView),
        startWith(null as View),
        pairwise(),
        switchMap(([previousView, view]) =>
          view ? this.subscribeToView(previousView, view) : this.subscribeToDefault()
        )
      )
      .subscribe(({mapId, config}: { mapId?: string; config?: MapConfig }) => {
        if (mapId) {
          this.store$.dispatch(new MapsAction.CreateMap({mapId, config}));
        }
      });
  }

  private subscribeToView(
    previousView: View,
    view: View
  ): Observable<{ mapId?: string; config?: MapConfig }> {
    const mapId = view.code;
    return this.store$.pipe(
      select(selectMapById(mapId)),
      take(1),
      withLatestFrom(this.store$.pipe(select(selectMapPosition))),
      map(([map, position]) => {
        if (preferViewConfigUpdate(previousView, view, !!map)) {

          const mapConfig = view.config && view.config.map;
          const config: MapConfig = {
            ...mapConfig,
            position: mapConfig.positionSaved ? mapConfig.position : position,
          };
          return {mapId, config: config, view};
        }
        return {mapId, config: map && map.config};
      })
    );
  }

  private subscribeToDefault(): Observable<{ mapId?: string; config?: MapConfig }> {
    const mapId = DEFAULT_MAP_ID;
    return this.store$.pipe(
      select(selectCollectionsInQuery),
      distinctUntilChanged((a, b) => a.length === b.length),
      switchMap(collections =>
        this.store$.pipe(
          select(selectDefaultViewConfig(Perspective.Map, collectionsDefaultViewMapKey(collections))),
          distinctUntilChanged((a,b) => deepObjectsEquals(defaultViewMapPosition(a), defaultViewMapPosition(b))),
          withLatestFrom(this.store$.pipe(select(selectMapById(mapId))), this.store$.pipe(select(selectMapPosition))),
          map(([defaultConfig, map, position], index) => {
            const defaultMapConfig = defaultConfig && defaultConfig.config && defaultConfig.config.map;

            console.log(index, defaultMapConfig && defaultMapConfig.position, map && map.config && map.config.position);
            const attributeIdsMap = {...map && map.config && map.config.attributeIdsMap || {}};
            for (const collection of collections) {
              if (!attributeIdsMap[collection.id]) {
                attributeIdsMap[collection.id] = filterLocationAttributes(collection.attributes).map(attribute => attribute.id);
              }
            }

            const config: MapConfig = {
              ...DEFAULT_MAP_CONFIG,
              attributeIdsMap,
              position: defaultMapConfig && defaultMapConfig.position || map && map.config && map.config.position || position
            };

            return {mapId, config};
          })
        )
      ));
  }

  private subscribeToMapConfig(): Subscription {
    return this.store$
      .pipe(
        select(selectMap),
        debounceTime(1000),
        filter(map => !!map),
        withLatestFrom(this.store$.pipe(select(selectCollectionsInQuery)), this.selectCurrentDefaultViewConfig$()),
        filter(([, collections,]) => collections.length > 0),
      )
      .subscribe(([map, collections, currentViewConfig]) => {

        if (map.id === DEFAULT_MAP_ID && map.config && map.config.position) {
          const savedPosition = defaultViewMapPosition(currentViewConfig);
          console.log(savedPosition, map.config.position, deepObjectsEquals(map.config.position, savedPosition));
          if (!deepObjectsEquals(map.config.position, savedPosition)) {
            this.saveMapDefaultViewConfig(collections, map.config);
          }
        }

        if (map.config && map.config.position) {
          this.redirectToMapPosition(map.config.position);
        }
      });
  }

  private selectCurrentDefaultViewConfig$(): Observable<DefaultViewConfig> {
    return this.selectTableDefaultConfigId$().pipe(
      mergeMap(collectionId =>
        this.store$.pipe(
          select(selectDefaultViewConfig(Perspective.Map, collectionId)),
        )
      )
    );
  }

  private selectTableDefaultConfigId$(): Observable<string> {
    return this.store$.pipe(
      select(selectQuery),
      map(query => getBaseCollectionIdsFromQuery(query)[0])
    );
  }

  private saveMapDefaultViewConfig(collections: Collection[], mapConfig: MapConfig) {
    const config: ViewConfig = {map: {position: mapConfig.position}};
    collections.forEach(collection => {
      const model: DefaultViewConfig = {key: collection.id, perspective: Perspective.Map, config};
      this.store$.dispatch(new ViewsAction.SetDefaultConfig({model}));
    })
  }

  private subscribeToMapConfigPosition(): Subscription {
    return this.store$
      .pipe(
        select(selectMapConfig),
        filter(config => config && !!config.position)
      )
      .subscribe(config => this.redirectToMapPosition(config.position));
  }

  private redirectToMapPosition(position: MapPosition) {
    const matrixParams = {
      ...(position.bearing ? {mb: position.bearing.toFixed(1)} : undefined),
      mc: formatMapCoordinates(position.center),
      ...(position.pitch ? {mp: position.pitch.toFixed(1)} : undefined),
      mz: position.zoom.toFixed(2),
    };

    this.router.navigate(['../map', matrixParams], {
      queryParamsHandling: 'preserve',
      relativeTo: this.activatedRoute.parent,
    });
  }

  private setupSidebar() {
    this.store$
      .pipe(
        select(selectCurrentView),
        withLatestFrom(this.store$.pipe(select(selectSidebarOpened))),
        take(1)
      )
      .subscribe(([currentView, sidebarOpened]) => this.openOrCloseSidebar(currentView, sidebarOpened));
  }

  private openOrCloseSidebar(view: View, opened: boolean) {
    if (view) {
      this.sidebarOpened$.next(opened);
    } else {
      this.sidebarOpened$.next(true);
    }
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public onSidebarToggle() {
    if (this.mapContentComponent) {
      setTimeout(() => this.mapContentComponent.refreshMapSize());
    }

    const opened = !this.sidebarOpened$.getValue();
    this.store$.dispatch(new ViewsAction.SetSidebarOpened({opened}));
    this.sidebarOpened$.next(opened);
  }
}

function defaultViewMapPosition(config: DefaultViewConfig): MapPosition {
  return config && config.config && config.config.map && config.config.map.position;
}

function collectionsDefaultViewMapKey(collections: Collection[]): string {
  return collections && collections[0] && collections[0].id || '';
}
