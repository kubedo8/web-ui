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
import {TranslatedRole} from '../../../core/model/role-group';
import {ResourceType} from '../../../core/model/resource-type';

@Pipe({
  name: 'roleTooltip',
})
export class RoleTooltipPipe implements PipeTransform {
  public transform(role: TranslatedRole, resourceType: ResourceType): string {
    if (role.fromParentOrTeams) {
      let inheritedMessage: string;
      switch (resourceType) {
        case ResourceType.Organization:
          inheritedMessage = $localize`:@@organization.permission.role.inherited:This right is obtained from teams.`;
          break;
        case ResourceType.Project:
          inheritedMessage = $localize`:@@project.permission.role.inherited:This right is obtained from teams, or organization.`;
          break;
        default:
          inheritedMessage = $localize`:@@collection.permission.role.inherited:This right is obtained from teams, organization, or project.`;
          break;
      }
      return `${role.tooltip} ${inheritedMessage}`;
    }
    return role.tooltip;
  }
}
