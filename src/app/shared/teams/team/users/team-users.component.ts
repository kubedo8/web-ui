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

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {OptionsDropdownComponent} from '../../../dropdown/options/options-dropdown.component';
import {USER_AVATAR_SIZE} from '../../../../core/constants';
import {User} from '../../../../core/store/users/user';
import {KeyCode} from '../../../key-code';
import {DropdownOption} from '../../../dropdown/options/dropdown-option';
import {areArraysSame, uniqueValues} from '../../../utils/array.utils';
import {DropdownPosition} from '../../../dropdown/dropdown-position';

@Component({
  selector: 'team-users',
  templateUrl: './team-users.component.html',
  styleUrls: ['./team-users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamUsersComponent implements OnChanges {
  @Input()
  public users: User[];

  @Input()
  public selectedUserIds: string[];

  @Input()
  public editable: boolean;

  @Output()
  public save = new EventEmitter<string[]>();

  @ViewChild('wrapperElement')
  public wrapperElement: ElementRef<HTMLElement>;

  @ViewChild('textInput')
  public textInput: ElementRef<HTMLInputElement>;

  @ViewChild(OptionsDropdownComponent)
  public dropdown: OptionsDropdownComponent;

  public readonly avatarSize = USER_AVATAR_SIZE;

  private preventSave: boolean;
  public suggesting: boolean;
  public name: string = '';
  public selectedUsers$ = new BehaviorSubject<User[]>([]);

  public readonly dropdownPositions = [
    DropdownPosition.BottomStart,
    DropdownPosition.TopStart,
    DropdownPosition.BottomEnd,
    DropdownPosition.TopEnd,
    DropdownPosition.Left,
    DropdownPosition.Right,
  ];

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedUserIds && this.selectedUserIds) {
      this.selectedUsers$.next(this.users?.filter(user => this.selectedUserIds.includes(user.id)) || []);
    }
  }

  public onFocus() {
    this.suggesting = true;
    this.dropdown?.resetActiveOption();
    this.dropdown?.open();
  }

  public onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case KeyCode.Enter:
      case KeyCode.NumpadEnter:
      case KeyCode.Tab:
        const selectedOption = this.dropdown?.getActiveOption();

        event.preventDefault();

        if (event.code !== KeyCode.Tab && selectedOption) {
          event.stopImmediatePropagation();
          this.toggleOption(selectedOption);
        } else {
          this.preventSaveAndBlur();
          this.saveValue(selectedOption);
        }
        return;
      case KeyCode.Escape:
        this.preventSaveAndBlur();
        this.resetSearchInput();
        return;
      case KeyCode.Backspace:
        if (!this.name && this.selectedUsers$.value.length > 0) {
          this.selectedUsers$.next(this.selectedUsers$.value.slice(0, this.selectedUsers$.value.length - 1));
        }
        return;
    }

    this.dropdown.onKeyDown(event);
  }

  private preventSaveAndBlur() {
    if (this.textInput) {
      this.preventSave = true;
      this.textInput.nativeElement.blur();
      this.blurCleanup();
    }
  }

  private toggleOption(option: DropdownOption) {
    if (this.selectedUsers$.value.some(o => o.id === option.value)) {
      this.selectedUsers$.next(this.selectedUsers$.value.filter(o => o.id !== option.value));
    } else {
      const selectUser = (this.users || []).find(o => o.id === option.value);
      if (selectUser) {
        this.selectedUsers$.next([...this.selectedUsers$.value, selectUser]);
        setTimeout(() => (this.wrapperElement.nativeElement.scrollLeft = Number.MAX_SAFE_INTEGER));
      }
    }
    this.resetSearchInput();
  }

  private saveValue(activeOption?: DropdownOption) {
    const selectedUser =
      (activeOption && this.users.find(option => option.id === activeOption.value)) ||
      this.users.find(user => (user.name || user.email) === this.name?.trim());
    const options = [...this.selectedUsers$.value, selectedUser].filter(option => !!option);
    const ids = uniqueValues(options.map(option => option.id));
    if (!areArraysSame(ids, this.selectedUserIds)) {
      this.save.emit(ids);
      this.resetSearchInput();
    }
  }

  private resetSearchInput() {
    this.name = '';
  }

  public onBlur() {
    if (this.preventSave) {
      this.preventSave = false;
    } else {
      this.saveValue();
    }
    this.blurCleanup();
  }

  public onSelectOption(option: DropdownOption) {
    this.toggleOption(option);
  }

  private blurCleanup() {
    this.dropdown?.close();
    this.suggesting = false;
  }

  public onMouseDown(event: MouseEvent) {
    // prevent hide dropdown on mouse down (instead input)
    if (this.textInput && !this.textInput.nativeElement.contains(event.target as any)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }

  public trackByUser(index: number, user: User): string {
    return user.id;
  }

  public onClick() {
    if (!this.suggesting) {
      this.textInput?.nativeElement.focus();
    }
  }
}
