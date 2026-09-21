'use client';

export { PictureInPicture } from './PictureInPicture';
export type { PictureInPictureProps } from './PictureInPicture';

export { usePictureInPicture, DEFAULT_FORCE_PARAM } from './use-picture-in-picture';
export type {
  PictureInPictureRenderState,
  PipController,
  PipStage,
  UsePictureInPictureOptions,
} from './use-picture-in-picture';

export {
  DEFAULT_STRATEGY_ORDER,
  detectCapabilities,
  isStrategySupported,
  readForcedStrategy,
  resolveOrder,
  selectStrategies,
} from './capabilities';

export { defaultPlatform } from './platform';

export { DEFAULT_CANVAS_FPS, DEFAULT_CANVAS_SCALE } from './strategies/canvas';
export { DEFAULT_DOCUMENT_SIZE } from './strategies/document';
export { DEFAULT_INLINE_SIZE } from './strategies/inline';
export type { InlineWidget } from './strategies/inline';

export type {
  CanvasRenderInfo,
  CanvasRenderer,
  CanvasStrategyOptions,
  DocumentStrategyOptions,
  InlineStrategyOptions,
  PipCapabilities,
  PipMode,
  PipPlatform,
  PipStrategy,
  Position,
  Size,
} from './types';
