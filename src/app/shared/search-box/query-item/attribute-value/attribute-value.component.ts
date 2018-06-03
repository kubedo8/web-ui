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

import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {AbstractControl, FormGroup} from '@angular/forms';

import {AttributeQueryItem} from '../model/attribute.query-item';
import {getCaretCharacterOffsetWithin, HtmlModifier} from '../../../utils/html-modifier';
import {KeyCode} from '../../../key-code';

@Component({
  selector: 'attribute-value',
  templateUrl: './attribute-value.component.html',
  styleUrls: ['./attribute-value.component.scss']
})
export class AttributeValueComponent {

  @Input()
  public queryItem: AttributeQueryItem;

  @Input()
  public readonly: boolean;

  @Input()
  public form: FormGroup;

  @Output()
  public enter = new EventEmitter();

  @Output()
  public moveLeft = new EventEmitter();

  @ViewChild('conditionValueInput')
  private conditionValueInput: ElementRef;

  public get conditionValueControl(): AbstractControl {
    return this.form.get('conditionValue');
  }

  public onBlur() {
    this.setValue(this.queryItem.conditionValue.trim());
  }

  public onInput(value: string) {
    this.setValue(value);
  }

  private setValue(value: string) {
    this.conditionValueControl.setValue(value);
    this.queryItem.conditionValue = value;
  }

  public onKeyDown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case KeyCode.LeftArrow:
        this.onLeftArrowKeyDown();
        break;
      case KeyCode.Enter:
        event.preventDefault();
        break;
      case KeyCode.Backspace:
        this.onBackspaceKeyDown();
        break;
      case KeyCode.Escape:
        this.onEscapeKeyDown();
        break;
    }
  }

  public focusInput() {
    setTimeout(() => HtmlModifier.setCursorAtTextContentEnd(this.conditionValueInput.nativeElement));
  }

  private onLeftArrowKeyDown() {
    this.moveLeftOnCaretStart();
  }

  public onEnterKeyUp() {
    this.enter.emit();
  }

  private onBackspaceKeyDown() {
    this.moveLeftOnCaretStart();
  }

  private moveLeftOnCaretStart() {
    const caretOffset = getCaretCharacterOffsetWithin(this.conditionValueInput.nativeElement);
    if (caretOffset === 0) {
      this.moveLeft.emit();
    }
  }

  private onEscapeKeyDown() {
    this.conditionValueInput.nativeElement.blur();
  }
}
