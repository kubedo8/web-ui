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

import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject} from 'rxjs';
import {DRAG_DELAY} from '../../../../../core/constants';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';

import {KanbanAttribute, KanbanColumn, KanbanConfig} from '../../../../../core/store/kanbans/kanban';
import {DocumentModel} from '../../../../../core/store/documents/document.model';
import {SelectionHelper} from '../../../../../shared/document/post-it/util/selection-helper';
import {AllowedPermissions} from '../../../../../core/model/allowed-permissions';
import {ConstraintData} from '../../../../../core/model/data/constraint';
import {AppState} from '../../../../../core/store/app.state';
import {Collection} from '../../../../../core/store/collections/collection';
import {findAttributeConstraint} from '../../../../../core/store/collections/collection.util';
import {DocumentModel} from '../../../../../core/store/documents/document.model';
import {generateDocumentData} from '../../../../../core/store/documents/document.utils';
import {DocumentsAction} from '../../../../../core/store/documents/documents.action';

import {KanbanColumn, KanbanConfig} from '../../../../../core/store/kanbans/kanban';
import {Query} from '../../../../../core/store/navigation/query';
import {getQueryFiltersForCollection} from '../../../../../core/store/navigation/query.util';
import {User} from '../../../../../core/store/users/user';
import {SelectionHelper} from '../../../../../shared/document/post-it/util/selection-helper';
import {getSaveValue} from '../../../../../shared/utils/data.utils';
import {generateId} from '../../../../../shared/utils/resource.utils';
import {getSaveValue} from '../../../../../shared/utils/data.utils';
import {User} from '../../../../../core/store/users/user';
import {generateId} from '../../../../../shared/utils/resource.utils';
import {BehaviorSubject} from 'rxjs';
import {DRAG_DELAY} from '../../../../../core/constants';
import {ConstraintData} from '../../../../../core/model/data/constraint';
import {DataResource} from '../../../../../core/model/resource';
import {KanbanResourceCreate} from './footer/kanban-column-footer.component';
import {LinkType} from '../../../../../core/store/link-types/link.type';
import {LinkInstance} from '../../../../../core/store/link-instances/link.instance';
import {filterDocumentsByStem} from '../../../../../core/store/documents/documents.filters';
import {generateDocumentData, groupDocumentsByCollection} from '../../../../../core/store/documents/document.utils';
import {
  getQueryFiltersForCollection,
  queryStemAttributesResourcesOrder,
} from '../../../../../core/store/navigation/query.util';
import {DocumentsAction} from '../../../../../core/store/documents/documents.action';
import {AppState} from '../../../../../core/store/app.state';
import {Store} from '@ngrx/store';
import {BsModalService} from 'ngx-bootstrap';
import {ChooseLinkDocumentModalComponent} from '../../modal/choose-link-document/choose-link-document-modal.component';

export interface KanbanCard {
  dataResource: DataResource;
  attributeId: string;
}

@Component({
  selector: 'kanban-column',
  templateUrl: './kanban-column.component.html',
  styleUrls: ['./kanban-column.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanColumnComponent implements OnInit, OnChanges {
  @ViewChild('cardWrapper', {static: true})
  public cardWrapperElement: ElementRef;

  @ViewChild('columnBody', {static: true})
  public columnBodyElement: ElementRef;

  @Input()
  public cards: KanbanCard[];

  @Input()
  public config: KanbanConfig;

  @Input()
  public column: KanbanColumn;

  @Input()
  public dragColumnsIds: string[];

  @Input()
  public collections: Collection[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public documents: DocumentModel[];

  @Input()
  public linkInstances: LinkInstance[];

  @Input()
  public canManageConfig: boolean;

  @Input()
  public permissions: Record<string, AllowedPermissions>;

  @Input()
  public query: Query;

  @Input()
  public currentUser: User;

  @Input()
  public constraintData: ConstraintData;

  @Output()
  public patchDocumentData = new EventEmitter<DocumentModel>();

  @Output()
  public removeDocument = new EventEmitter<DocumentModel>();

  @Output()
  public columnsChange = new EventEmitter<{columns: KanbanColumn[]; otherColumn: KanbanColumn}>();

  public selectionHelper: SelectionHelper;
  public columnSelectionId: string;
  public documentsIds$ = new BehaviorSubject<string[]>([]);
  public readonly dragDelay = DRAG_DELAY;

  constructor(private store$: Store<AppState>, private modalService: BsModalService) {}

  public ngOnInit() {
    this.columnSelectionId = this.column.id || generateId();
    this.selectionHelper = new SelectionHelper(
      this.documentsIds$,
      key => this.documentRows(key),
      () => 1,
      this.columnSelectionId
    );
  }

  private documentRows(key: string): number {
    const document = (this.cards || []).find(card => card.dataResource.id === key);
    return (document && Object.keys(document.dataResource.data).length - 1) || 0;
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.documents) {
      this.documentsIds$.next((this.cards || []).map(card => card.dataResource.id));
    }
  }

  public trackByCard(index: number, card: KanbanCard) {
    return card.dataResource.id;
  }

  public onDropPostIt(event: CdkDragDrop<KanbanColumn, KanbanColumn>) {
    if (this.postItPositionChanged(event)) {
      this.updatePostItsPosition(event);

      if (this.postItContainerChanged(event)) {
        this.updatePostItValue(event);
      }
    }
  }

  private postItPositionChanged(event: CdkDragDrop<KanbanColumn, KanbanColumn>): boolean {
    return this.postItContainerChanged(event) || event.previousIndex !== event.currentIndex;
  }

  private updatePostItsPosition(event: CdkDragDrop<KanbanColumn, KanbanColumn>) {
    const columns = this.config.columns.map(col => ({...col, resourcesOrder: [...col.resourcesOrder]}));
    const otherColumn = {...this.config.otherColumn, resourcesOrder: this.config.otherColumn.resourcesOrder};
    const column = columns.find(col => col.id === event.container.id) || otherColumn;

    if (event.container.id === event.previousContainer.id) {
      moveItemInArray(column.resourcesOrder, event.previousIndex, event.currentIndex);
    } else {
      const previousColumn = columns.find(col => col.id === event.previousContainer.id);
      if (previousColumn) {
        transferArrayItem(
          previousColumn.resourcesOrder,
          column.resourcesOrder,
          event.previousIndex,
          event.currentIndex
        );
      } else {
        // it's Other column
        transferArrayItem(otherColumn.resourcesOrder, column.resourcesOrder, event.previousIndex, event.currentIndex);
      }
    }

    this.columnsChange.emit({columns, otherColumn});
  }

  private postItContainerChanged(event: CdkDragDrop<KanbanColumn, KanbanColumn>): boolean {
    return event.container.id !== event.previousContainer.id;
  }

  private updatePostItValue(event: CdkDragDrop<KanbanColumn, KanbanColumn>) {
    const card = event.item.data as KanbanCard;
    const document = card.dataResource as DocumentModel;
    const newValue = event.container.data.title;

    const collection = (this.collections || []).find(coll => coll.id === document.collectionId);
    if (collection) {
      const constraint = findAttributeConstraint(collection.attributes, configAttribute.attributeId);
      const value = getSaveValue(newValue, constraint, this.constraintData);
      const data = {...document.data, [card.attributeId]: value};
      this.patchDocumentData.emit({...document, data});

    }
  }

  public createObjectInResource(resourceCreate: KanbanResourceCreate) {
    const previousDocuments = this.getPreviousDocumentByKanbanResource(resourceCreate);
    if (previousDocuments.length > 0) {
      const linkTypeId = this.getPreviousLinkTypeIdByKanbanResource(resourceCreate);
      if (previousDocuments.length === 1) {
        this.createDocument(resourceCreate.kanbanAttribute, previousDocuments[0], linkTypeId);
      } else {
        const previousCollection = this.collections.find(coll => coll.id === previousDocuments[0].collectionId);
        this.showChooseDocumentModal(resourceCreate.kanbanAttribute, previousDocuments, previousCollection, linkTypeId);
      }
    } else {
      this.createDocument(resourceCreate.kanbanAttribute);
    }
  }

  private showChooseDocumentModal(
    kanbanAttribute: KanbanAttribute,
    documents: DocumentModel[],
    collection: Collection,
    linkTypeId: string
  ) {
    const callback = document => this.createDocument(kanbanAttribute, document, linkTypeId);
    const config = {initialState: {documents, collection, callback}, keyboard: true};
    this.modalService.show(ChooseLinkDocumentModalComponent, config);
  }

  private getPreviousDocumentByKanbanResource(resourceCreate: KanbanResourceCreate): DocumentModel[] {
    const {pipelineDocuments} = filterDocumentsByStem(
      groupDocumentsByCollection(this.documents),
      this.collections,
      this.linkTypes,
      this.linkInstances,
      resourceCreate.stem,
      []
    );
    const pipelineIndex = resourceCreate.kanbanAttribute.resourceIndex / 2;
    return pipelineDocuments[pipelineIndex - 1] || [];
  }

  private getPreviousLinkTypeIdByKanbanResource(resourceCreate: KanbanResourceCreate): string {
    const attributesResourcesOrder = queryStemAttributesResourcesOrder(
      resourceCreate.stem,
      this.collections,
      this.linkTypes
    );
    const linkType = attributesResourcesOrder[resourceCreate.kanbanAttribute.resourceIndex - 1];
    return linkType && linkType.id;
  }

  private createDocument(kanbanAttribute: KanbanAttribute, linkDocument?: DocumentModel, linkTypeId?: string) {
    const document = this.createDocumentWithData(kanbanAttribute);
    if (linkDocument && linkTypeId) {
      this.store$.dispatch(
        new DocumentsAction.CreateWithLink({
          document,
          otherDocumentId: linkDocument.id,
          linkTypeId,
          callback: documentId => this.onDocumentCreated(documentId),
        })
      );
    } else {
      this.store$.dispatch(
        new DocumentsAction.Create({
          document,
          callback: documentId => this.onDocumentCreated(documentId),
        })
      );
    }
  }

  private createDocumentWithData(kanbanAttribute: KanbanAttribute): DocumentModel {
    const collection = (this.collections || []).find(coll => coll.id === kanbanAttribute.resourceId);
    const collectionsFilters = getQueryFiltersForCollection(this.query, collection.id);
    const data = generateDocumentData(collection, collectionsFilters, this.currentUser);
    const constraint = findAttributeConstraint(collection.attributes, kanbanAttribute.attributeId);
    data[kanbanAttribute.attributeId] = getSaveValue(this.column.title, constraint, this.constraintData);
    return {collectionId: collection.id, data};
  }

  private onDocumentCreated(id: string) {
    setTimeout(() => {
      const postIt = document.getElementById(`${this.columnSelectionId}#${id}`);
      postIt && postIt.scrollIntoView();
    });
  }

  public onRemoveDocument(document: DocumentModel) {
    this.removeDocument.emit(document);
  }
}
