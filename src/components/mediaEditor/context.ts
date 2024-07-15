import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';
import {AdjustmentsConfig} from './adjustments';

export interface MediaEditorContextValue {
  managers: AppManagers
  canvasResolutionSignal: Signal<[number, number]>
  pixelRatio: number
  imageSrc: string
  adjustments: AdjustmentsConfig
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
