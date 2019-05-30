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

import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {PivotPerspectiveComponent} from './pivot-perspective.component';
import {SharedModule} from '../../../shared/shared.module';
import {PivotPerspectiveRoutingModule} from './pivot-perspective-routing.module';
import {PivotPerspectiveWrapperComponent} from './wrapper/pivot-perspective-wrapper.component';
import {PivotConfigComponent} from './wrapper/config/pivot-config.component';
import {PivotTableWrapperComponent} from './wrapper/table-wrapper/pivot-table-wrapper.component';
import {PivotTableComponent} from './wrapper/table-wrapper/table/pivot-table.component';
import {PivotAttributeConfigComponent} from './wrapper/config/attribute/pivot-attribute-config.component';
import { PivotHeaderSelectItemsPipe } from './pipe/pivot-header-select-items.pipe';
import { PivotSelectItemsPipe } from './pipe/pivot-select-items.pipe';
import { PivotClearAttributePipe } from './pipe/pivot-clear-attribute.pipe';

@NgModule({
  declarations: [
    PivotPerspectiveComponent,
    PivotPerspectiveWrapperComponent,
    PivotConfigComponent,
    PivotTableWrapperComponent,
    PivotTableComponent,
    PivotAttributeConfigComponent,
    PivotHeaderSelectItemsPipe,
    PivotSelectItemsPipe,
    PivotClearAttributePipe,
  ],
  imports: [
    SharedModule,
    RouterModule,
    PivotPerspectiveRoutingModule,
    DragDropModule,
  ],
})
export class PivotPerspectiveModule {
}
