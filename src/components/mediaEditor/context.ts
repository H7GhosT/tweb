import {createContext, Signal} from 'solid-js';
import {AppManagers} from '../../lib/appManagers/managers';

interface MediaEditorContextValue {
  managers: AppManagers
  canvasResolutionSignal: Signal<[number, number]>
  pixelRatio: number
  imageSrc: string
}

const MediaEditorContext = createContext<MediaEditorContextValue>()
export default MediaEditorContext
