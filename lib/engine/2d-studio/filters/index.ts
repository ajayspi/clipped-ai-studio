// lib/engine/2d-studio/filters/index.ts
// Unified GPU Post-Processing Filters Catalog
// High-performance WebGL2 fragment filters for 2D and 3D scenes.

export { CRTFilter } from './crt-surveillance';
export type { CRTOptions } from './crt-surveillance';

export { ShockwaveFilter } from './shockwave';
export type { ShockwaveOptions } from './shockwave';

export { DisplacementFilter } from './displacement';
export type { DisplacementOptions } from './displacement';

export { RisoFilter, RISO_INK, RISO_PAPER } from './riso';
export type { RisoOptions } from './riso';

export { WoodblockFilter, WOODBLOCK_PALETTE } from './woodblock';
export type { WoodblockOptions } from './woodblock';

export { getFilter, applyFilter } from './manager';
export type { FilterName, AnyFilterInstance, AnyFilterOptions } from './manager';
