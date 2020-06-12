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

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {DocumentService} from './document.service';
import {BaseService} from '../../rest/base.service';
import {AppState} from '../../store/app.state';
import {DocumentDto, LinkInstanceDto} from '../../dto';
import {DocumentMetaDataDto} from '../../dto/document.dto';
import {Workspace} from '../../store/navigation/workspace';
import {environment} from '../../../../environments/environment';
import {generateId} from '../../../shared/utils/resource.utils';
import {selectDocumentById, selectDocumentsByIds} from '../../store/documents/documents.state';
import {convertDocumentModelToDto} from '../../store/documents/document.converter';

@Injectable()
export class MockDocumentService extends BaseService implements DocumentService {
  constructor(private httpClient: HttpClient, protected store$: Store<AppState>) {
    super(store$);
  }

  public createDocument(document: DocumentDto): Observable<DocumentDto> {
    return of({...document, id: generateId()});
  }

  public patchDocument(
    collectionId: string,
    documentId: string,
    document: Partial<DocumentDto>
  ): Observable<DocumentDto> {
    return this.getDocumentFromStore$(documentId).pipe(
      map(documentFromStore => ({...documentFromStore, ...document}))
    );
  }

  public updateDocumentData(document: DocumentDto): Observable<DocumentDto> {
    return this.getDocumentFromStore$(document.id).pipe(map(documentFromStore => ({
      ...documentFromStore,
      data: document.data
    })));
  }

  public patchDocumentData(document: DocumentDto): Observable<DocumentDto> {
    return this.getDocumentFromStore$(document.id).pipe(map(documentFromStore => ({
      ...documentFromStore,
      data: {...documentFromStore.data, ...document.data}
    })));
  }

  public updateDocumentMetaData(document: DocumentDto): Observable<DocumentDto> {
    return this.getDocumentFromStore$(document.id).pipe(map(documentFromStore => ({
      ...documentFromStore,
      metaData: document.metaData
    })));
  }

  public patchDocumentMetaData(
    collectionId: string,
    documentId: string,
    metaData: DocumentMetaDataDto
  ): Observable<DocumentDto> {
    return this.getDocumentFromStore$(documentId).pipe(map(documentFromStore => ({
      ...documentFromStore,
      metaData: {...documentFromStore.metaData, ...metaData}
    })));
  }

  private getDocumentFromStore$(id: string): Observable<DocumentDto> {
    return this.store$.pipe(
      select(selectDocumentById(id)),
      take(1),
      map(model => model && convertDocumentModelToDto(model))
    )
  }

  public removeDocument(collectionId: string, documentId: string): Observable<any> {
    return of(documentId);
  }

  public addFavorite(collectionId: string, documentId: string, workspace?: Workspace): Observable<any> {
    return of(true);
  }

  public removeFavorite(collectionId: string, documentId: string, workspace?: Workspace): Observable<any> {
    return of(true);
  }

  public getDocument(collectionId: string, documentId: string): Observable<DocumentDto> {
    return of(null);
  }

  public getDocuments(documentsId: string[]): Observable<DocumentDto[]> {
    return this.httpClient.post<DocumentDto[]>(`${this.workspaceApiPrefix()}/data/documents`, documentsId);
  }

  public duplicateDocuments(
    collectionId: string,
    documentIds: string[],
    correlationId?: string
  ): Observable<DocumentDto[]> {
    return this.store$.pipe(
      select(selectDocumentsByIds(documentIds)),
      take(1),
      map(documents => documents.map(document => ({...convertDocumentModelToDto(document), id: generateId()})))
    )
  }

  public createChain(
    documents: DocumentDto[],
    linkInstances: LinkInstanceDto[]
  ): Observable<{ documents: DocumentDto[]; linkInstances: LinkInstanceDto[] }> {
    const chainDocuments: DocumentDto[] = documents.map(doc => ({...doc, id: doc.id || generateId()}));
    const chainLinks: LinkInstanceDto[] = linkInstances.map((linkInstance, index) => ({
      ...linkInstance,
      id: linkInstance.id || generateId(),
      documentIds: [chainDocuments[index]?.id, chainDocuments[index + 1]?.id]
    }))
    return of({documents: chainDocuments, linkInstances: chainLinks});
  }

  private workspaceApiPrefix(workspace?: Workspace): string {
    const organizationId = this.getOrCurrentOrganizationId(workspace);
    const projectId = this.getOrCurrentProjectId(workspace);

    return `${environment.apiUrl}/rest/organizations/${organizationId}/projects/${projectId}`;
  }
}
