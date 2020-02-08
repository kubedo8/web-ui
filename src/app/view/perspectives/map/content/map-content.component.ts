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
import {select, Store} from '@ngrx/store';
import {I18n} from '@ngx-translate/i18n-polyfill';
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {AddressConstraint} from '../../../../core/model/constraint/address.constraint';
import {CoordinatesConstraint} from '../../../../core/model/constraint/coordinates.constraint';
import {ConstraintData, ConstraintType} from '../../../../core/model/data/constraint';
import {CoordinatesConstraintConfig} from '../../../../core/model/data/constraint-config';
import {NotificationService} from '../../../../core/notifications/notification.service';
import {Collection} from '../../../../core/store/collections/collection';
import {selectCollectionsDictionary} from '../../../../core/store/collections/collections.state';
import {selectDocumentsByQuery} from '../../../../core/store/common/permissions.selectors';
import {DocumentModel} from '../../../../core/store/documents/document.model';
import {DocumentsAction} from '../../../../core/store/documents/documents.action';
import {GeoLocation} from '../../../../core/store/geocoding/geo-location';
import {GeocodingAction} from '../../../../core/store/geocoding/geocoding.action';
import {selectGeocodingQueryCoordinates} from '../../../../core/store/geocoding/geocoding.state';
import {
  MapAttributeType,
  MapCoordinates,
  MapMarkerProperties,
  MapModel,
  MapPosition,
} from '../../../../core/store/maps/map.model';
import {MapsAction} from '../../../../core/store/maps/maps.action';
import {selectMapConfigById} from '../../../../core/store/maps/maps.state';
import {CollectionsPermissionsPipe} from '../../../../shared/pipes/permissions/collections-permissions.pipe';
import {
  areMapMarkerListsEqual,
  createMarkerPropertiesList,
  extractCollectionsFromDocuments,
  populateCoordinateProperties,
} from './map-content.utils';
import {MapRenderComponent} from './render/map-render.component';
import {MarkerMoveEvent} from './render/marker-move.event';
import {ADDRESS_DEFAULT_FIELDS} from '../../../../shared/modal/attribute-type/form/constraint-config/address/address-constraint.constants';
import {ModalService} from '../../../../shared/modal/modal.service';
import {ConstraintDataService} from '../../../../core/service/constraint-data.service';
import {selectConstraintData} from '../../../../core/store/constraint-data/constraint-data.state';

@Component({
  selector: 'map-content',
  templateUrl: './map-content.component.html',
  styleUrls: ['./map-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapContentComponent implements OnInit, OnDestroy {
  @Input()
  public collections: Collection[] = [];

  @Input()
  public documents: DocumentModel[] = [];

  @Input()
  public map: MapModel;

  @ViewChild(MapRenderComponent, {static: false})
  public mapRenderComponent: MapRenderComponent;

  public loading$ = new BehaviorSubject(true);

  public constraintData$: Observable<ConstraintData>;
  public markers$: Observable<MapMarkerProperties[]>;

  private refreshMarkers$ = new BehaviorSubject(Date.now());

  private subscriptions = new Subscription();

  constructor(
    private collectionsPermissions: CollectionsPermissionsPipe,
    private i18n: I18n,
    private notificationService: NotificationService,
    private constraintDataService: ConstraintDataService,
    private store$: Store<{}>,
    private modalService: ModalService
  ) {
  }

  public ngOnInit() {
    this.constraintData$ = this.store$.pipe(select(selectConstraintData));
    const allProperties$ = this.bindAllProperties();
    this.markers$ = this.bindMarkers(allProperties$);

    this.subscriptions.add(this.subscribeToUninitializedProperties(allProperties$));
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private bindAllProperties(): Observable<MapMarkerProperties[]> {
    return combineLatest([
      this.store$.pipe(select(selectCollectionsDictionary)),
      this.store$.pipe(select(selectDocumentsByQuery)),
      this.store$.pipe(
        select(selectMapConfigById(this.map.id)),
        map(config => config.attributeIdsMap),
        distinctUntilChanged()
      ),
    ]).pipe(
      switchMap(([collectionsMap, documents, attributeIdsMap]) => {
        const collections = extractCollectionsFromDocuments(collectionsMap, documents);
        return this.collectionsPermissions
          .transform(collections)
          .pipe(
            map(permissions => createMarkerPropertiesList(documents, attributeIdsMap, collectionsMap, permissions))
          );
      })
    );
  }

  private bindMarkers(allProperties$: Observable<MapMarkerProperties[]>): Observable<MapMarkerProperties[]> {
    return allProperties$.pipe(
      switchMap(allProperties => {
        const {coordinateProperties, otherProperties} = populateCoordinateProperties(allProperties);
        return this.populateAddressProperties(otherProperties).pipe(
          map(addressProperties => coordinateProperties.concat(addressProperties))
        );
      }),
      distinctUntilChanged((previous, next) => areMapMarkerListsEqual(previous, next)),
      switchMap(properties => this.refreshMarkers$.pipe(map(() => [...properties])))
    );
  }

  private populateAddressProperties(propertiesList: MapMarkerProperties[]): Observable<MapMarkerProperties[]> {
    return this.store$.pipe(
      select(selectGeocodingQueryCoordinates),
      map(queryCoordinates =>
        propertiesList.reduce((addressPropertiesList, properties) => {
          const coordinates = queryCoordinates[properties.document.data[properties.attributeId]];
          if (coordinates) {
            const addressProperties: MapMarkerProperties = {
              ...properties,
              coordinates,
              attributeType: MapAttributeType.Address,
            };
            addressPropertiesList.push(addressProperties);
          }
          return addressPropertiesList;
        }, [])
      )
    );
  }

  private subscribeToUninitializedProperties(allProperties$: Observable<MapMarkerProperties[]>): Subscription {
    return allProperties$
      .pipe(map(allProperties => populateCoordinateProperties(allProperties).otherProperties))
      .subscribe(uninitializedProperties => this.getCoordinates(uninitializedProperties));
  }

  private getCoordinates(propertiesList: MapMarkerProperties[]) {
    const addresses = propertiesList.map(properties => properties.document.data[properties.attributeId]);
    if (addresses.length === 0) {
      this.loading$.next(false);
      return;
    }

    this.loading$.next(true);

    this.store$.dispatch(
      new GeocodingAction.GetCoordinates({
        queries: addresses,
        onSuccess: () => this.loading$.next(false),
        onFailure: () => this.loading$.next(false),
      })
    );
  }

  public onMapMove(position: MapPosition) {
    this.store$.dispatch(new MapsAction.ChangePosition({mapId: this.map.id, position}));
  }

  public onMarkerMove(event: MarkerMoveEvent) {
    const attribute = event.properties.collection.attributes.find(attr => attr.id === event.properties.attributeId);
    const constraintType = attribute && attribute.constraint && attribute.constraint.type;

    if (event.properties.attributeType === MapAttributeType.Address || constraintType === ConstraintType.Address) {
      this.saveAddressAttribute(event.properties, event.coordinates);
    } else {
      this.saveCoordinatesAttribute(event.properties, event.coordinates);
    }
  }

  private saveAddressAttribute(properties: MapMarkerProperties, coordinates: MapCoordinates) {
    this.store$.dispatch(
      new GeocodingAction.GetLocation({
        coordinates,
        onSuccess: location => this.onGetLocationSuccess(location, properties, coordinates),
        onFailure: error => this.onGetLocationFailure(error),
      })
    );
  }

  private onGetLocationSuccess(location: GeoLocation, properties: MapMarkerProperties, coordinates: MapCoordinates) {
    if (!location || !location.address || !location.address.street) {
      this.saveCoordinatesAttribute(properties, coordinates);
      return;
    }

    const attribute = properties.collection.attributes.find(attr => attr.id === properties.attributeId);
    const value = (attribute.constraint || new AddressConstraint({fields: ADDRESS_DEFAULT_FIELDS}))
      .createDataValue(location.address)
      .serialize();
    this.store$.dispatch(new GeocodingAction.GetCoordinatesSuccess({coordinatesMap: {[value]: location.coordinates}}));
    this.saveAttributeValue(properties, value);
  }

  private onGetLocationFailure(error: any) {
    this.notificationService.error(
      this.i18n({id: 'map.content.location.error', value: 'I could not save the new location.'})
    );

    // revert moved marker position
    this.refreshMarkers$.next(Date.now());
  }

  private saveCoordinatesAttribute(properties: MapMarkerProperties, coordinates: MapCoordinates) {
    const value = new CoordinatesConstraint({} as CoordinatesConstraintConfig).createDataValue(coordinates).serialize();
    this.saveAttributeValue(properties, value);
  }

  private saveAttributeValue(properties: MapMarkerProperties, value: string) {
    this.store$.dispatch(
      new DocumentsAction.PatchData({
        document: {
          collectionId: properties.collection.id,
          id: properties.document.id,
          data: {[properties.attributeId]: value},
        },
      })
    );
  }

  public refreshMapSize() {
    if (this.mapRenderComponent) {
      this.mapRenderComponent.refreshMapSize();
    }
  }

  public onMarkerDetail(properties: MapMarkerProperties) {
    this.modalService.showDocumentDetail(properties.document, properties.collection);
  }
}
