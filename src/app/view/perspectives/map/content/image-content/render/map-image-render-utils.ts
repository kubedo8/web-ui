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

import {shadeColor} from '../../../../../../shared/utils/html-modifier';
import * as d3Select from 'd3-selection';
import {MapMarkerProperties} from '../../../../../../core/store/maps/map.model';
import {iconsMap} from '../../../../../../shared/picker/icons';
import {of} from 'rxjs';

export type SVGContainer = d3Select.Selection<SVGElement, any, any, any>;

export interface Rectangle {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

const defaultMarkerSize: Rectangle = {height: 40, width: 30};

export function addMarkerToSvgContainer(
  container: SVGContainer,
  properties: MapMarkerProperties,
  scale: number,
  x: number,
  y: number,
  width: number = defaultMarkerSize.width,
  height: number = defaultMarkerSize.height
): SVGContainer {
  const marker = container
    .append('svg')
    .attr('id', properties.id)
    .attr('width', width)
    .attr('height', height)
    .attr('x', x)
    .attr('initial-x', x / scale)
    .attr('y', y)
    .attr('initial-y', y / scale)
    .attr('viewBox', `${-width / 2} ${-height} ${width} ${height}`)
    .style('cursor', 'pointer');

  marker
    .append('path')
    .attr('d', markerPath(height, width / 2))
    .style('fill', properties.color);

  const circleCenterY = -height + width / 2;
  const innerCircleRadius = width / 2 - 4;

  marker
    .append('circle')
    .attr('cx', 0)
    .attr('cy', circleCenterY)
    .attr('r', innerCircleRadius)
    .attr('fill', shadeColor(properties.color, -0.3));

  if (properties.icons?.length === 1) {
    marker
      .append('text')
      .attr('x', 0)
      .attr('y', circleCenterY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .style('font-family', '"Font Awesome 5 Pro"')
      .style('font-size', '12px')
      .text(() => '\uf6bb');
  } else if (properties.icons?.length === 2) {
    const radius = innerCircleRadius / 2 - 1;
    const icons = properties.icons.map(icon => icon.split(' ').slice(-1)[0]).map(icon => iconsMap[icon]);
    marker
      .append('text')
      .attr('x', -radius)
      .attr('y', circleCenterY - radius)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .style('font-family', '"Font Awesome 5 Pro"')
      .style('font-size', '7px')
      .text(() => icons[0]);

    marker
      .append('text')
      .attr('x', radius)
      .attr('y', circleCenterY + radius)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .style('font-family', '"Font Awesome 5 Pro"')
      .style('font-size', '7px')
      .text(() => icons[1]);
  }

  return marker;
}

function markerPath(height: number, radius: number): string {
  const dyAC = height - radius;
  const alpha = Math.acos(radius / dyAC);
  const deltaX = radius * Math.sin(alpha);
  const deltaY = (height * (height - radius * 2)) / dyAC;
  return `M 0,0
    L ${-deltaX},${-deltaY}
    A ${radius} ${radius} 1 1 1 ${deltaX},${-deltaY}
    L 0,0 z`;
}

const pointScale = 10000; // 0.0001 is 1 pixel

export function computeMarkerPosition(
  position: Position,
  scale: number,
  center: Rectangle,
  bounds: Rectangle,
  markerSize: Rectangle = defaultMarkerSize
): {x: number; y: number} {
  let x = position.x * pointScale + center.width / 2;
  x = checkXBounds(x, center, bounds);
  x = x * scale - (markerSize.width * scale) / 2; // TODO add translation x

  let y = position.y * pointScale + center.height / 2;
  y = checkYBounds(y, center, bounds);
  y = y * scale - markerSize.height * scale; // TODO add translation y

  return {x, y};
}

export function checkXBounds(x: number, center: Rectangle, bounds: Rectangle, offset = 0): number {
  const lowerX = center.width / 2 - bounds.width / 2 - offset;
  const upperX = center.width / 2 + bounds.width / 2 - offset;
  return Math.max(Math.min(upperX, x), lowerX);
}

export function checkYBounds(y: number, center: Rectangle, bounds: Rectangle, offset = 0): number {
  const lowerY = center.height / 2 - bounds.height / 2 - offset;
  const upperY = center.height / 2 + bounds.height / 2 - offset;
  return Math.max(Math.min(upperY, y), lowerY);
}

export function scaleRectangle(rectangle: Rectangle, scale: number): Rectangle {
  return {width: rectangle.width * scale, height: rectangle.height * scale};
}

export function checkDragBounds(
  position: Position,
  scale: number,
  center: Rectangle,
  bounds: Rectangle,
  markerSize: Rectangle = defaultMarkerSize
): Position {
  const centerScaled = scaleRectangle(center, scale);
  const boundsScaled = scaleRectangle(bounds, scale);
  const x = checkXBounds(position.x, centerScaled, boundsScaled, markerSize.width / 2);
  const y = checkYBounds(position.y, centerScaled, boundsScaled, markerSize.height);
  return {x, y};
}
