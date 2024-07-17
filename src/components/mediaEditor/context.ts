import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';

export interface MediaEditorContextValue {
  managers: AppManagers
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig

  isCroping: Signal<boolean>
  imageSize: Signal<[number, number]>
  canvasResolution: Signal<[number, number]>
  currentImageRatio: Signal<number>
  scale: Signal<number>
  rotation: Signal<number>
  translation: Signal<[number, number]>
  flip: Signal<[number, number]>
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
