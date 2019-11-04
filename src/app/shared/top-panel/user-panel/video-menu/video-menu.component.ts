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

import {ChangeDetectionStrategy, Component, OnInit, ViewChild} from '@angular/core';
import {AppState} from '../../../../core/store/app.state';
import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {VideoModel} from '../../../../core/store/videos/video.model';
import {selectVideosByUrl} from '../../../../core/store/videos/videos.state';
import {selectUrl} from '../../../../core/store/navigation/navigation.state';
import {mergeMap} from 'rxjs/operators';
import {BsModalService} from 'ngx-bootstrap';
import {PlayVideoModalComponent} from './play-video-modal/play-video-modal.component';
import {VideoMenuDropdownComponent} from './dropdown/video-menu-dropdown.component';

@Component({
  selector: 'video-menu',
  templateUrl: './video-menu.component.html',
  styleUrls: ['./video-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoMenuComponent implements OnInit {
  public videos$: Observable<VideoModel[]>;

  @ViewChild(VideoMenuDropdownComponent, {static: true})
  public videoMenuDropdown: VideoMenuDropdownComponent;

  constructor(private store: Store<AppState>, private bsModalService: BsModalService) {}

  public ngOnInit(): void {
    this.videos$ = this.store.pipe(
      select(selectUrl),
      mergeMap(url => this.store.pipe(select(selectVideosByUrl(url))))
    );
  }

  public openPlayer(video: VideoModel): void {
    this.videoMenuDropdown.close();

    const initialState = {video};
    const config = {initialState, keyboard: true, class: 'modal-lg'};
    this.bsModalService.show(PlayVideoModalComponent, config);
  }
}
