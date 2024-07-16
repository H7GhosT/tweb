import {useContext} from 'solid-js';
import MediaEditorContext from '../context';

export function getCropOffset() {
  const [canvasResolution] = useContext(MediaEditorContext).canvasResolution
  if(!canvasResolution()) return {left: 0, top: 0, width: 0, height: 0}

  const w = canvasResolution()[0], h = canvasResolution()[1];
  return {
    left: 60,
    top: 60,
    width: w - 120,
    height: h - 180
  }
}
