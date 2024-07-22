import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';
import {ResizableLayer, TextLayerInfo, TextRenderingInfo} from './canvas/resizableLayers';
import {RenderingPayload} from './webgl/initWebGL';
import {BrushDrawnLine} from './canvas/brushPainter';

export interface MediaEditorContextValue {
  managers: AppManagers
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig
  renderingPayload: Signal<RenderingPayload>

  currentTab: Signal<string>

  imageSize: Signal<[number, number]>
  canvasSize: Signal<[number, number]>
  currentImageRatio: Signal<number>
  fixedImageRatioKey: Signal<string>
  scale: Signal<number>
  rotation: Signal<number>
  translation: Signal<[number, number]>
  flip: Signal<[number, number]>


  resizableLayersSeed: number
  currentTextLayerInfo: Signal<TextLayerInfo>
  resizableLayers: Signal<Signal<ResizableLayer>[]>
  selectedResizableLayer: Signal<number>
  textLayersInfo: Signal<Record<number, TextRenderingInfo>>

  imageCanvas: Signal<HTMLCanvasElement>
  currentBrush: Signal<{
    color: string
    size: number
    brush: string
  }>
  brushDrawnLines: Signal<BrushDrawnLine[]>
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
