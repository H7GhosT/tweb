import {useContext} from 'solid-js';

import MediaEditorContext from '../context';
import {getSnappedViewportsScale} from '../utils';

import {getCropOffset} from './cropOffset';

export default function getFinalTransform() {
  const context = useContext(MediaEditorContext);
  const [canvasSize] = context.canvasSize;
  const [currentTab] = context.currentTab;
  const [currentImageRatio] = context.currentImageRatio;
  const [translation] = context.translation;
  const [scale] = context.scale;
  const [rotation] = context.rotation;
  const [flip] = context.flip;
  const [renderingPayload] = context.renderingPayload;

  const isCroping = () => currentTab() === 'crop';

  const payload = renderingPayload();
  if(!payload) return;

  const cropOffset = getCropOffset();

  const [w, h] = canvasSize();

  const imageRatio = payload.image.width / payload.image.height;

  let toCropScale = getSnappedViewportsScale(imageRatio, cropOffset.width, cropOffset.height, w, h);
  const fromCroppedScale = 1 / getSnappedViewportsScale(currentImageRatio(), cropOffset.width, cropOffset.height, w, h);

  const snappedImageScale = Math.min(w / payload.image.width, h / payload.image.height);

  if(!isCroping()) {
    toCropScale *= fromCroppedScale;
  }

  let cropTranslation = [0, 0];
  if(isCroping()) {
    cropTranslation = [0, cropOffset.left + cropOffset.height / 2 - h / 2];
  } else {
    cropTranslation = translation().map((x) => x * fromCroppedScale - x);
  }

  return {
    flip: flip(),
    rotation: rotation(),
    scale: scale() * context.pixelRatio * snappedImageScale * toCropScale,
    translation: [cropTranslation[0] + translation()[0], cropTranslation[1] + translation()[1]].map(
      (v) => v * context.pixelRatio
    ) as [number, number]
  }
}
