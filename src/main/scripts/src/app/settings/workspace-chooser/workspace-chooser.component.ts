/*
 * -----------------------------------------------------------------------\
 * Lumeer
 *
 * Copyright (C) since 2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * -----------------------------------------------------------------------/
 */

import {Component, ViewChild} from '@angular/core';
import {Router} from '@angular/router';

import {WorkspaceChooserService} from './workspace-chooser.service';
import {Organization} from '../../shared/organization';
import {Project} from '../../shared/project';
import {WorkspaceService} from '../../core/workspace.service';

const squareSize: number = 170;

@Component({
  selector: 'workspace-chooser',
  template: require('./workspace-chooser.component.html'),
  styles: [require('./workspace-chooser.component.scss').toString()]
})
export class WorkspaceChooserComponent {

  @ViewChild('orgs') public companiesEl: any;
  @ViewChild('projs') public projectsEl: any;

  private organizationsWidth: number = 0;
  private projectsWidth: number = 0;
  private activeOrganization: Organization;
  private activeProject: Project;

  constructor(private workspaceChooserService: WorkspaceChooserService,
              private workspaceService: WorkspaceService,
              private router: Router) {
  }

  public ngOnInit() {
    if (this.workspaceChooserService.oganizations) {
      this.organizationsWidth = (this.workspaceChooserService.oganizations.length + 1) * squareSize + 5;
    } else {
      this.workspaceChooserService.fetchOrganizations()
        .subscribe((orgs: Organization[]) => {
          this.workspaceChooserService.oganizations = orgs;
          this.organizationsWidth = (this.workspaceChooserService.oganizations.length + 1) * squareSize + 5;
        });
    }
    if (this.workspaceService.organization && this.workspaceService.project) {
      this.projectsWidth = this.workspaceService.organization.projects.length * squareSize + 5;
      this.activeOrganization = this.workspaceService.organization;
      this.activeProject = this.workspaceService.project;
    }
  }

  public onOrganizationSelected(organization: Organization, index: number) {
    this.workspaceChooserService.oganizations.forEach((org: Organization) => org.active = false);
    organization.active = true;
    organization.index = index;
    if (organization.projects) {
      organization.projects.forEach((project: Project) => project.active = false);
      this.projectsWidth = (organization.projects.length + 1) * squareSize + 5;
    } else {
      this.workspaceChooserService.fetchProjects(organization.code)
        .subscribe((projects: Project[]) => {
          organization.projects = projects;
          this.projectsWidth = (projects.length + 1 ) * squareSize + 5;
        });
    }
    this.activeOrganization = organization;
    this.activeProject = undefined;
  }

  public onProjectSelected(project: Project, index: number) {
    this.activeOrganization.projects.forEach((oneProject: Project) => oneProject.active = false);
    project.active = true;
    this.activeProject = project;
  }

  public onScrollOrganizations(toRight?: boolean) {
    if (toRight) {
      this.companiesEl.scrollToLeft(this.companiesEl.elementRef.nativeElement.scrollLeft + squareSize);
    } else {
      this.companiesEl.scrollToLeft(this.companiesEl.elementRef.nativeElement.scrollLeft - squareSize);
    }
  }

  public onScrollProjects(toRight?: boolean) {
    if (toRight) {
      this.projectsEl.scrollToLeft(this.projectsEl.elementRef.nativeElement.scrollLeft + squareSize);
    } else {
      this.projectsEl.scrollToLeft(this.projectsEl.elementRef.nativeElement.scrollLeft - squareSize);
    }
  }

  public onSaveActiveItems() {
    if (this.activeOrganization && this.activeProject) {
      this.workspaceService.organization = this.activeOrganization;
      this.workspaceService.project = this.activeProject;
    }
  }

  public onCreateOrganization() {
    this.router.navigate(['/organization']);
  }

  public onCreateProject() {
    if (this.activeOrganization) {
      this.router.navigate(['/organization/' + this.activeOrganization.code + '/project']);
    }
  }

  public onOrganizationSettings(organization: Organization) {
    this.router.navigate(['/organization/' + organization.code]);
  }

  public onProjectSettings(project: Project) {
    if (this.activeOrganization) {
      this.router.navigate(['/organization/' + this.activeOrganization.code + '/project/' + project.code]);
    }
  }

}
