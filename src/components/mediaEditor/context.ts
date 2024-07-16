import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';

export interface MediaEditorContextValue {
  managers: AppManagers
  canvasResolution: Signal<[number, number]>
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig
  isCroping: Signal<boolean>
  currentImageRatio: Signal<number>
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
