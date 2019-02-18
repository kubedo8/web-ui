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
import {CommonModule} from '@angular/common';
import {CreateCalendarEventComponent} from './create-calendar-event.component';
import {CreateCalendarEventFormComponent} from './create-calendar-event-form/create-calendar-event-form.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BsDatepickerModule, TimepickerModule} from 'ngx-bootstrap';
import {DialogWrapperModule} from '../shared/wrapper/dialog-wrapper.module';
import {SelectModule} from '../../shared/select/select.module';
import {PipesModule} from '../../shared/pipes/pipes.module';

@NgModule({
  declarations: [CreateCalendarEventComponent, CreateCalendarEventFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    PipesModule,
    ReactiveFormsModule,
    BsDatepickerModule,
    TimepickerModule,
    DialogWrapperModule,
  ],
  exports: [CreateCalendarEventComponent],
})
export class CreateCalendarEventModule {}
