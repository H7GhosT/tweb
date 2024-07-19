import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';

export interface MediaEditorContextValue {
  managers: AppManagers
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig

  currentTab: Signal<string>

  imageSize: Signal<[number, number]>
  canvasResolution: Signal<[number, number]>
  currentImageRatio: Signal<number>
  fixedImageRatioKey: Signal<string>
  scale: Signal<number>
  rotation: Signal<number>
  translation: Signal<[number, number]>
  flip: Signal<[number, number]>

  currentTextLayerInfo: Signal<{
    color: string
    alignment: string
    style: string
    size: number
    font: string
  }>
  selectedTextLayer: Signal<number>

  imageCanvas: Signal<HTMLCanvasElement>
  currentBrush: Signal<{
    color: string
    size: number
    brush: string
  }>
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
