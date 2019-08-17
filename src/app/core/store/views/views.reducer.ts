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

import {PermissionType} from '../permissions/permissions';
import {View} from './view';
import {ViewsAction, ViewsActionType} from './views.action';
import {initialViewsState, viewsAdapter, ViewsState} from './views.state';

export function viewsReducer(state: ViewsState = initialViewsState, action: ViewsAction.All): ViewsState {
  switch (action.type) {
    case ViewsActionType.GET_SUCCESS:
      return addViews(state, action.payload.views);
    case ViewsActionType.CREATE_SUCCESS:
      return addOrUpdateView(state, action.payload.view);
    case ViewsActionType.UPDATE_SUCCESS:
      return addOrUpdateView(state, action.payload.view);
    case ViewsActionType.DELETE_SUCCESS:
      return viewsAdapter.removeOne(action.payload.viewId, state);
    case ViewsActionType.SET_PERMISSIONS_SUCCESS:
      return onSetPermissions(state, action);
    case ViewsActionType.RESET_VIEW_GLOBAL_CONFIG:
      return {...state, globalConfig: {}};
    case ViewsActionType.SET_SIDEBAR_OPENED:
      return {...state, globalConfig: {...state.globalConfig, sidebarOpened: action.payload.opened}};
    case ViewsActionType.CLEAR:
      return initialViewsState;
    default:
      return state;
  }
}

function addViews(state: ViewsState, views: View[]): ViewsState {
  const newState = {...state, loaded: true};
  const filteredViews = views.filter(view => {
    const oldView = state.entities[view.id];
    return !oldView || isViewNewer(view, oldView);
  });
  return viewsAdapter.addMany(filteredViews, newState);
}

function addOrUpdateView(state: ViewsState, view: View): ViewsState {
  const oldView = state.entities[view.id];
  if (!oldView) {
    return viewsAdapter.addOne(view, state);
  }

  if (isViewNewer(view, oldView)) {
    return viewsAdapter.upsertOne(view, state);
  }
  return state;
}

function isViewNewer(view: View, oldView: View): boolean {
  return view.version && (!oldView.version || view.version > oldView.version);
}

function onSetPermissions(state: ViewsState, action: ViewsAction.SetPermissionsSuccess): ViewsState {
  let permissions = state.entities[action.payload.viewId].permissions;
  if (action.payload.type === PermissionType.Users) {
    permissions = {...permissions, users: action.payload.permissions};
  } else {
    permissions = {...permissions, groups: action.payload.permissions};
  }
  return viewsAdapter.updateOne({id: action.payload.viewId, changes: {permissions}}, state);
}
