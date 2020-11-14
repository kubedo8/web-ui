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
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {CdkScrollable, ScrollDispatcher} from '@angular/cdk/overlay';
import {filter} from 'rxjs/operators';
import {TableNewRow, TableRow} from './model/table-row';
import {HiddenInputComponent} from '../input/hidden-input/hidden-input.component';
import {TableRowComponent} from './content/row/table-row.component';
import {ConstraintData, ConstraintType} from '../../core/model/data/constraint';
import {EditedTableCell, SelectedTableCell, TableCell, TableCellType, TableModel} from './model/table-model';
import {TableScrollService} from './service/table-scroll.service';
import {DataInputSaveAction} from '../data-input/data-input-save-action';
import {TableColumn, TableContextMenuItem} from './model/table-column';
import {AttributeSortType} from '../../core/store/views/view';
import {DocumentModel} from '../../core/store/documents/document.model';

@Component({
  selector: 'lmr-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  public tableModel: TableModel;

  @Input()
  public selectedCell: SelectedTableCell;

  @Input()
  public editedCell: EditedTableCell;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public scrollId: string;

  @Input()
  public selectedDocumentId: string;

  @Input()
  public syncScrollIds: string[];

  @Output()
  public columnResize = new EventEmitter<{column: TableColumn; width: number}>();

  @Output()
  public columnMove = new EventEmitter<{from: number; to: number}>();

  @Output()
  public columnRename = new EventEmitter<{column: TableColumn; name: string}>();

  @Output()
  public columnMenuSelected = new EventEmitter<{column: TableColumn; item: TableContextMenuItem}>();

  @Output()
  public columnHiddenMenuSelected = new EventEmitter<TableColumn[]>();

  @Output()
  public columnSortChanged = new EventEmitter<{column: TableColumn; type: AttributeSortType | null}>();

  @Output()
  public cellClick = new EventEmitter<TableCell>();

  @Output()
  public cellDoubleClick = new EventEmitter<TableCell>();

  @Output()
  public cellCancel = new EventEmitter<{cell: TableCell; action?: DataInputSaveAction}>();

  @Output()
  public rowNewValue = new EventEmitter<{
    row: TableRow;
    column: TableColumn;
    value: any;
    action: DataInputSaveAction;
    cellType: TableCellType;
  }>();

  @Output()
  public rowDetail = new EventEmitter<TableRow>();

  @Output()
  public rowLinkedDocumentSelect = new EventEmitter<{row: TableRow; document: DocumentModel}>();

  @Output()
  public rowNewClick = new EventEmitter();

  @Output()
  public rowMenuSelected = new EventEmitter<{
    row: TableRow;
    column: TableColumn;
    item: TableContextMenuItem;
    cellType: TableCellType;
  }>();

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  public viewPort: CdkVirtualScrollViewport;

  @ViewChildren('tableRow')
  public tableRows: QueryList<TableRowComponent>;

  @ViewChild(HiddenInputComponent)
  public hiddenInputComponent: HiddenInputComponent;

  public scrollDisabled$ = new BehaviorSubject(false);
  public detailColumnId: string;
  public scrollOffset: number;

  private subscriptions = new Subscription();
  private tableScrollService: TableScrollService;

  constructor(private scrollDispatcher: ScrollDispatcher, private element: ElementRef<HTMLElement>) {
    this.tableScrollService = new TableScrollService(() => this.viewPort);
  }

  public ngOnInit() {
    this.subscriptions.add(this.subscribeToScrolling());
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedCell && this.selectedCell) {
      this.checkScrollPositionForSelectedCell();
    }
    if (changes.tableModel) {
      this.scrollOffset = this.viewPort?.measureScrollOffset('left');
      this.viewPort?.checkViewportSize();
      this.detailColumnId = this.tableModel?.columns?.find(
        column =>
          !column.hidden &&
          (column.attribute?.constraint?.isTextRepresentation ||
            column.attribute?.constraint?.type === ConstraintType.User)
      )?.id;
    }
  }

  private checkScrollPositionForSelectedCell() {
    const {top, left} = this.tableScrollService.computeScrollOffsets(this.tableModel, this.selectedCell);
    this.viewPort?.scrollTo({top, left, behavior: 'smooth'});
  }

  private subscribeToScrolling(): Subscription {
    return this.scrollDispatcher
      .scrolled()
      .pipe(filter(scrollable => !!scrollable && this.isScrollableInsideComponent(scrollable)))
      .subscribe((scrollable: CdkScrollable) => {
        const left = scrollable.measureScrollOffset('left');

        Array.from(this.scrollDispatcher.scrollContainers.keys())
          .filter(
            otherScrollable =>
              otherScrollable !== scrollable &&
              otherScrollable.measureScrollOffset('left') !== left &&
              this.syncScrollIds?.includes(otherScrollable.getElementRef()?.nativeElement?.id)
          )
          .forEach(otherScrollable => otherScrollable.scrollTo({left}));
      });
  }

  private isScrollableInsideComponent(scrollable: CdkScrollable): boolean {
    return this.element.nativeElement.contains(scrollable.getElementRef().nativeElement);
  }

  public onMoveColumn(data: {fromIndex: number; toIndex: number}) {
    this.columnMove.emit({from: data.fromIndex, to: data.toIndex});
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public trackByRow(index: number, row: TableRow): string {
    return row.id;
  }

  public onBodyRowNewValue(row: TableRow, data: {columnId: string; value: any; action: DataInputSaveAction}) {
    const column = this.tableModel?.columns?.find(col => col.id === data.columnId);
    if (row && column) {
      this.rowNewValue.emit({...data, row, column, cellType: TableCellType.Body});
    }
  }

  public onNewRowNewValue(row: TableNewRow, data: {columnId: string; value: any; action: DataInputSaveAction}) {
    const column = this.tableModel?.columns?.find(col => col.id === data.columnId);
    if (row && column) {
      this.rowNewValue.emit({...data, row, column, cellType: TableCellType.NewRow});
    }
  }

  public onBodyCellClick(row: TableRow, columnId: string) {
    this.cellClick.emit({
      tableId: this.tableModel.id,
      documentId: row.documentId,
      linkId: row.linkInstanceId,
      rowId: row.id,
      columnId,
      type: TableCellType.Body,
    });
  }

  public onBodyCellDoubleClick(row: TableRow, columnId: string) {
    this.cellDoubleClick.emit({
      tableId: this.tableModel.id,
      documentId: row.documentId,
      linkId: row.linkInstanceId,
      rowId: row.id,
      columnId,
      type: TableCellType.Body,
    });
  }

  public onBodyCancel(row: TableRow, data: {action: DataInputSaveAction; columnId: string}) {
    const cell: TableCell = {
      tableId: this.tableModel.id,
      documentId: row.documentId,
      linkId: row.linkInstanceId,
      columnId: data.columnId,
      rowId: row.id,
      type: TableCellType.Body,
    };
    this.cellCancel.emit({cell, action: data.action});
  }

  public onHeaderCellClick(columnId: string) {
    this.cellClick.emit({tableId: this.tableModel.id, columnId, type: TableCellType.Header});
  }

  public onHeaderCellDoubleClick(columnId: string) {
    this.cellDoubleClick.emit({tableId: this.tableModel.id, columnId, type: TableCellType.Header});
  }

  public onHeaderCancel(columnId: string) {
    this.cellCancel.emit({cell: {tableId: this.tableModel.id, columnId, type: TableCellType.Header}});
  }

  public onNewRowCellClick(columnId: string) {
    this.cellClick.emit({
      tableId: this.tableModel.id,
      rowId: this.tableModel.newRow.id,
      columnId,
      type: TableCellType.NewRow,
    });
  }

  public onNewRowCellDoubleClick(columnId: string) {
    this.cellDoubleClick.emit({
      tableId: this.tableModel.id,
      rowId: this.tableModel.newRow.id,
      columnId,
      type: TableCellType.NewRow,
    });
  }

  public onNewRowCancel(columnId: string) {
    this.cellCancel.emit({
      cell: {
        tableId: this.tableModel.id,
        rowId: this.tableModel.newRow.id,
        columnId,
        type: TableCellType.NewRow,
      },
    });
  }

  public onScroll() {
    if (this.editedCell?.type === TableCellType.Header) {
      this.cellCancel.emit({cell: this.editedCell, action: DataInputSaveAction.Direct});
    }
  }

  public onBodyMenuSelected(data: {row: TableRow; column: TableColumn; item: TableContextMenuItem}) {
    this.rowMenuSelected.emit({...data, cellType: TableCellType.Body});
  }

  public onNewRowMenuSelected(data: {row: TableRow; column: TableColumn; item: TableContextMenuItem}) {
    this.rowMenuSelected.emit({...data, cellType: TableCellType.NewRow});
  }

  public onRowLinkedDocumentSelect(row: TableRow, document: DocumentModel) {
    this.rowLinkedDocumentSelect.emit({row, document});
  }
}
