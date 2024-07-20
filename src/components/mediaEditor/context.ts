import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';
import {ResizableLayer, TextLayerInfo} from './canvas/resizableLayers';

export interface MediaEditorContextValue {
  managers: AppManagers
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig

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

  imageCanvas: Signal<HTMLCanvasElement>
  currentBrush: Signal<{
    color: string
    size: number
    brush: string
  }>
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
