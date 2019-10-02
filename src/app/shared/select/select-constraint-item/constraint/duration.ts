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

import {ConstraintConfigOverrideService} from './constraint-config-override-service';
import {DurationConstraintConfig, DurationUnit} from '../../../../core/model/data/constraint-config';
import {SelectItemModel} from '../../select-item/select-item.model';
import {Constraint, ConstraintType} from '../../../../core/model/data/constraint';
import {I18n} from '@ngx-translate/i18n-polyfill';

const maxDurationUnits = [DurationUnit.Days, DurationUnit.Hours, DurationUnit.Minutes, DurationUnit.Seconds];

export class DurationConfigOverrideService extends ConstraintConfigOverrideService<DurationConstraintConfig> {
  private readonly defaultTitle: string;

  constructor(private i18n: I18n) {
    super();
    this.defaultTitle = i18n({id: 'default', value: 'Default'});
  }

  public create(config: DurationConstraintConfig): SelectItemModel[] {
    const defaultItem: SelectItemModel = {id: null, value: this.defaultTitle};
    return [
      defaultItem,
      ...maxDurationUnits.map(unit => ({
        id: {type: ConstraintType.Duration, config: {maxUnit: unit}} as Constraint,
        value: this.translateDurationUnit(unit),
      })),
    ];
  }

  private translateDurationUnit(unit: DurationUnit): string {
    return this.i18n(
      {
        id: 'select.constraint.items.duration.maxUnit',
        value: '{unit, select, w {w (weeks)} d {d (days)} h {h (hours)} m {m (minutes)} s {s (seconds)}}',
      },
      {unit}
    );
  }

  public isValidOverride(constraint: Constraint, overrideConstraint: Constraint): Constraint {
    const overrideConfig = overrideConstraint.config as DurationConstraintConfig;
    if (overrideConfig.maxUnit) {
      const maxUnit = maxDurationUnits.includes(overrideConfig.maxUnit) ? overrideConfig.maxUnit : null;
      return maxUnit && {...constraint, config: {...constraint.config, maxUnit}};
    }
    return constraint;
  }
}
