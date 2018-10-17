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

export interface ChartConfig {
  type: ChartType;
  xAxis?: ChartAxisModel;
  y1Axis?: ChartAxisModel;
  y2Axis?: ChartAxisModel;
}

export interface ChartAxisModel {

  collectionId: string;
  attributeId: string;

}

export enum ChartType {
  Line = 'line',
  Bar = 'bar',
  Pie = 'pie'
}

export const chartTypesMap: { [id: string]: ChartType } = {
  [ChartType.Line]: ChartType.Line,
  [ChartType.Bar]: ChartType.Bar,
  [ChartType.Pie]: ChartType.Pie
};

export const chartTypesIconsMap: { [id: string]: string } = {
  [ChartType.Line]: 'far fa-chart-line',
  [ChartType.Bar]: 'far fa-chart-bar',
  [ChartType.Pie]: 'far fa-chart-pie'
};

export enum ChartAxisType {
  X = 'x',
  Y1 = 'y1',
  Y2 = 'y2'
}