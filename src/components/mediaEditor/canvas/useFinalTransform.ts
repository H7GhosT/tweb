import {createEffect, createSignal, on, onCleanup, useContext} from 'solid-js';

import MediaEditorContext from '../context';
import {animateValue, getSnappedViewportsScale, lerp, lerpArray} from '../utils';

import {getCropOffset} from './cropOffset';

export type FinalTransform = {
  flip: [number, number];
  translation: [number, number];
  rotation: number;
  scale: number;
}

export default function useFinalTransform() {
  const context = useContext(MediaEditorContext);
  const [canvasSize] = context.canvasSize;
  const [currentTab] = context.currentTab;
  const [currentImageRatio] = context.currentImageRatio;
  const [translation] = context.translation;
  const [scale] = context.scale;
  const [rotation] = context.rotation;
  const [flip] = context.flip;
  const [renderingPayload] = context.renderingPayload;
  const [, setFinalTransform] = context.finalTransform;

  const isCroping = () => currentTab() === 'crop';

  const [cropTabAnimationProgress, setCropTabAnimationProgress] = createSignal(0);

  createEffect(on(isCroping, () => {
    const cancel = animateValue(
      cropTabAnimationProgress(),
      isCroping() ? 1 : 0,
      200,
      setCropTabAnimationProgress
    );

    onCleanup(cancel);
  }))

  createEffect(() => {
    const payload = renderingPayload();
    if(!payload) return;

    const cropOffset = getCropOffset();

    const [w, h] = canvasSize();

    const imageRatio = payload.image.width / payload.image.height;

    let toCropScale = getSnappedViewportsScale(imageRatio, cropOffset.width, cropOffset.height, w, h);
    const fromCroppedScale = 1 / getSnappedViewportsScale(currentImageRatio(), cropOffset.width, cropOffset.height, w, h);

    const snappedImageScale = Math.min(w / payload.image.width, h / payload.image.height);

    toCropScale *= lerp(fromCroppedScale, 1, cropTabAnimationProgress())

    const cropTranslation = lerpArray(
      translation().map((x) => x * fromCroppedScale - x),
      [0, cropOffset.left + cropOffset.height / 2 - h / 2],
      cropTabAnimationProgress()
    );

    setFinalTransform({
      flip: flip(),
      rotation: rotation(),
      scale: scale() * context.pixelRatio * snappedImageScale * toCropScale,
      translation: [cropTranslation[0] + translation()[0], cropTranslation[1] + translation()[1]].map(
        (v) => v * context.pixelRatio
      ) as [number, number]
    })
  })
}
