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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';

import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/store/app.state';
import {OrganizationsAction} from '../../core/store/organizations/organizations.action';
import {UsersAction} from '../../core/store/users/users.action';
import {GroupsAction} from '../../core/store/groups/groups.action';
import {Observable} from 'rxjs/Observable';
import {selectAllUsers} from '../../core/store/users/users.state';
import {filter, map} from 'rxjs/operators';
import {OrganizationModel} from "../../core/store/organizations/organization.model";
import {Subscription} from "rxjs/Subscription";
import {selectOrganizationByWorkspace} from "../../core/store/organizations/organizations.state";
import {isNullOrUndefined} from "util";
import {selectProjectsForWorkspace} from "../../core/store/projects/projects.state";
import {ProjectsAction} from "../../core/store/projects/projects.action";
import {RouterAction} from "../../core/store/router/router.action";

@Component({
  templateUrl: './organization-settings.component.html',
  styleUrls: ['./organization-settings.component.scss']
})
export class OrganizationSettingsComponent implements OnInit, OnDestroy {

  public userCount$: Observable<number>;
  public projectsCount$: Observable<number>;
  public organization: OrganizationModel;

  private organizationSubscription: Subscription;

  constructor(private router: Router,
              private store: Store<AppState>,
              private notificationService: NotificationService) {
  }

  public ngOnInit() {
    this.dispatchEvents();
    this.subscribeToStore();
  }

  public ngOnDestroy() {
    if (this.organizationSubscription) {
      this.organizationSubscription.unsubscribe();
    }
  }

  private dispatchEvents() {
    this.store.dispatch(new UsersAction.Get());
    this.store.dispatch(new GroupsAction.Get());
  }

  private subscribeToStore() {
    this.userCount$ = this.store.select(selectAllUsers)
      .pipe(map(users => users ? users.length : 0));

    this.projectsCount$ = this.store.select(selectProjectsForWorkspace)
      .pipe(map(projects => projects ? projects.length : 0));

    this.organizationSubscription = this.store.select(selectOrganizationByWorkspace)
      .pipe(filter(organization => !isNullOrUndefined(organization)))
      .subscribe(organization => {
        this.checkOrganizationFromStore(organization);
        this.organization = organization;
      });
  }

  private checkOrganizationFromStore(organization: OrganizationModel) {
    if (isNullOrUndefined(this.organization)) {
      this.store.dispatch(new ProjectsAction.Get({organizationId: organization.id}));
    } else if (this.organization.code !== organization.code) {
      this.updateWorkspaceUrl(this.organization);
    }
  }

  public onDelete() {
    this.notificationService.confirm(
      'Deleting an organization will permanently remove it.',
      'Delete Organization?',
      [
        {text: 'Yes', action: () => this.deleteOrganization(), bold: false},
        {text: 'No'}
      ]
    );
  }

  private deleteOrganization() {
    if (isNullOrUndefined(this.organization)) {
      return;
    }

    this.store.dispatch(new OrganizationsAction.Delete({organizationId: this.organization.id}));
    this.goBack();
  }

  public onNewDescription(newDescription: string) {
    if (isNullOrUndefined(this.organization)) {
      return;
    }

    const organizationCopy = {...this.organization, description: newDescription};
    this.updateOrganization(organizationCopy);
  }

  public onNewName(newName: string) {
    if (isNullOrUndefined(this.organization)) {
      return;
    }

    const organizationCopy = {...this.organization, name: newName};
    this.updateOrganization(organizationCopy);
  }

  public onNewCode(newCode: string) {
    if (isNullOrUndefined(this.organization)) {
      return;
    }

    const organizationCopy = {...this.organization, code: newCode};
    this.updateOrganization(organizationCopy);
  }

  private updateOrganization(organization: OrganizationModel) {
    this.store.dispatch(new OrganizationsAction.Update({organization}))
  }

  private updateWorkspaceUrl(organization: OrganizationModel) {
    this.store.dispatch(new RouterAction.Go({path: ['/organization', organization.code, 'users']}));
  }

  public onProjectsClick() {
    this.goBack();
  }

  private goBack(): void {
    this.store.dispatch(new RouterAction.Go({path: ['/workspace']}));
  }

}
