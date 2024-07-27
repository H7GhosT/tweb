import {useContext} from 'solid-js';

import MediaEditorContext from '../context';
import {getSnappedViewportsScale} from '../math/viewports';

import {getCropOffset} from './cropOffset';

export default function getCropTransform() {
  const context = useContext(MediaEditorContext);
  const [canvasSize] = context.canvasSize;
  const [currentTab] = context.currentTab;
  const [imageSize] = context.imageSize;

  const isCroping = () => currentTab() === 'crop';

  const cropOffset = getCropOffset();

  const [w, h] = canvasSize();
  const imageRatio = imageSize()[0] / imageSize()[1];
  const scale = getSnappedViewportsScale(imageRatio, cropOffset.width, cropOffset.height, w, h);

  const cropTranslationY = cropOffset.top + cropOffset.height / 2 - h / 2;

  return isCroping() ? `scale(${scale}) translateY(${cropTranslationY / scale}px)` : undefined
}
