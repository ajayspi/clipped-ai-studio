// lib/engine/2d-studio/filters/manager.ts
// Universal Filter Manager & Shot Filter Pipeline
// Caches WebGL2 filter singletons and handles buffer swapping for post-processing.

import { CRTFilter, CRTOptions } from './crt-surveillance';
import { ShockwaveFilter, ShockwaveOptions } from './shockwave';
import { DisplacementFilter, DisplacementOptions } from './displacement';
import { RisoFilter, RisoOptions } from './riso';
import { WoodblockFilter, WoodblockOptions } from './woodblock';

export type FilterName =
  | 'crt'
  | 'crt_surveillance'
  | 'cctv'
  | 'shockwave'
  | 'blast'
  | 'displacement'
  | 'fluid'
  | 'water'
  | 'riso'
  | 'woodblock';

export type AnyFilterInstance =
  | CRTFilter
  | ShockwaveFilter
  | DisplacementFilter
  | RisoFilter
  | WoodblockFilter;

export type AnyFilterOptions =
  | CRTOptions
  | ShockwaveOptions
  | DisplacementOptions
  | RisoOptions
  | WoodblockOptions;

let filterInstances: Map<string, AnyFilterInstance> | null = null;
let swapCanvas: HTMLCanvasElement | null = null;

export function getFilter(name: FilterName | string, width = 1080, height = 1920): AnyFilterInstance | null {
  if (typeof document === 'undefined') return null;
  if (!filterInstances) filterInstances = new Map();
  const key = `${name}_${width}x${height}`;
  if (filterInstances.has(key)) return filterInstances.get(key) || null;

  let instance: AnyFilterInstance | null = null;
  if (name === 'crt' || name === 'crt_surveillance' || name === 'cctv') {
    instance = new CRTFilter(width, height);
  } else if (name === 'shockwave' || name === 'blast') {
    instance = new ShockwaveFilter(width, height);
  } else if (name === 'displacement' || name === 'fluid' || name === 'water') {
    instance = new DisplacementFilter(width, height);
  } else if (name === 'riso') {
    instance = new RisoFilter(width, height);
  } else if (name === 'woodblock') {
    instance = new WoodblockFilter(width, height);
  }

  if (instance) filterInstances.set(key, instance);
  return instance;
}

/**
 * Apply a post-processing filter to a canvas in-place.
 */
export function applyFilter(
  canvas: HTMLCanvasElement,
  filterName: FilterName | string,
  options: AnyFilterOptions = {}
): void {
  if (typeof document === 'undefined' || !canvas) return;
  const f = getFilter(filterName, canvas.width, canvas.height);
  if (!f) return;

  if (!swapCanvas) {
    swapCanvas = document.createElement('canvas');
  }
  if (swapCanvas.width !== canvas.width || swapCanvas.height !== canvas.height) {
    swapCanvas.width = canvas.width;
    swapCanvas.height = canvas.height;
  }

  const sctx = swapCanvas.getContext('2d');
  if (!sctx) return;
  sctx.drawImage(canvas, 0, 0);
  f.render(swapCanvas, canvas, options as never);
}
