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

import {EffectsModule} from '@ngrx/effects';
import {routerReducer} from '@ngrx/router-store';
import {Action, ActionReducerMap, StoreModule} from '@ngrx/store';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {environment} from '../../../environments/environment';
import {AppStateActionType} from './app-state-action';
import {AppState, initialAppState} from './app.state';
import {CollectionsEffects} from './collections/collections.effects';
import {collectionsReducer} from './collections/collections.reducer';
import {initialCollectionsState} from './collections/collections.state';
import {DocumentsEffects} from './documents/documents.effects';
import {documentsReducer} from './documents/documents.reducer';
import {initialDocumentsState} from './documents/documents.state';
import {GroupsEffects} from './groups/groups.effects';
import {groupsReducer} from './groups/groups.reducer';
import {initialGroupsState} from './groups/groups.state';
import {LinkInstancesEffects} from './link-instances/link-instances.effects';
import {linkInstancesReducer} from './link-instances/link-instances.reducer';
import {initialLinkInstancesState} from './link-instances/link-instances.state';
import {LinkTypesEffects} from './link-types/link-types.effects';
import {linkTypesReducer} from './link-types/link-types.reducer';
import {initialLinkTypesState} from './link-types/link-types.state';
import {navigationReducer} from './navigation/navigation.reducer';
import {NotificationsEffects} from './notifications/notifications.effects';
import {OrganizationsEffects} from './organizations/organizations.effects';
import {organizationsReducer} from './organizations/organizations.reducer';
import {ProjectsEffects} from './projects/projects.effects';
import {projectsReducer} from './projects/projects.reducer';
import {RouterEffects} from './router/router.effects';
import {smartDocTemplatesReducer} from './smartdoc-templates/smartdoc-templates.reducer';
import {initialSmartDocTemplatesState} from './smartdoc-templates/smartdoc-templates.state';
import {UsersEffects} from './users/users.effects';
import {usersReducer} from './users/users.reducer';
import {initialUsersState} from './users/users.state';
import {ViewsEffects} from './views/views.effects';
import {viewsReducer} from './views/views.reducer';
import {initialViewsState} from './views/views.state';

const reducers: ActionReducerMap<AppState> = {
  collections: collectionsReducer,
  documents: documentsReducer,
  groups: groupsReducer,
  linkInstances: linkInstancesReducer,
  linkTypes: linkTypesReducer,
  navigation: navigationReducer,
  organizations: organizationsReducer,
  projects: projectsReducer,
  router: routerReducer,
  users: usersReducer,
  views: viewsReducer,
  smartDocTemplates: smartDocTemplatesReducer
};

const effects = [
  CollectionsEffects,
  DocumentsEffects,
  GroupsEffects,
  LinkInstancesEffects,
  LinkTypesEffects,
  NotificationsEffects,
  OrganizationsEffects,
  ProjectsEffects,
  RouterEffects,
  UsersEffects,
  ViewsEffects
];

function appStateReducer(reducer) {
  return function newReducer(state: AppState, action: Action): AppState {
    if (action.type === AppStateActionType.RESET_WITHOUT_WORKSPACE) {
      state = {
        ...state,
        collections: initialCollectionsState,
        documents: initialDocumentsState,
        groups: initialGroupsState,
        linkInstances: initialLinkInstancesState,
        linkTypes: initialLinkTypesState,
        users: initialUsersState,
        views: initialViewsState,
        smartDocTemplates: initialSmartDocTemplatesState
      };
    }
    return reducer(state, action);
  }
}

@NgModule({
  imports: [
    StoreModule.forRoot(reducers, {initialState: initialAppState, metaReducers: [appStateReducer]}),
    EffectsModule.forRoot(effects),
    !environment.production ? StoreDevtoolsModule.instrument({maxAge: 10}) : []
  ],
  declarations: []
})
export class AppStoreModule {
}
