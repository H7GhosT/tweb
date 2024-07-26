import {createEffect, onMount, useContext} from 'solid-js';

import MediaEditorContext from '../context';
import {AdjustmentsConfig} from '../adjustments';
import {initWebGL} from '../webgl/initWebGL';
import {draw} from '../webgl/draw';
import {getSnappedViewportsScale} from '../math/viewports';

import {getCropOffset} from './cropOffset';

function drawAdjustedImage(gl: WebGLRenderingContext) {
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

  draw(gl, payload, {
    flip: flip(),
    rotation: rotation(),
    scale: scale() * context.pixelRatio * snappedImageScale * toCropScale,
    translation: [cropTranslation[0] + translation()[0], cropTranslation[1] + translation()[1]].map(
      (v) => v * context.pixelRatio
    ) as [number, number],
    imageSize: [payload.image.width, payload.image.height],
    ...(Object.fromEntries(
      context.adjustments.map(({key, signal, to100}) => {
        const value = signal[0]();
        return [key, value / (to100 ? 100 : 50)];
      })
    ) as Record<AdjustmentsConfig[number]['key'], number>)
  });
}

export default function ImageCanvas() {
  const context = useContext(MediaEditorContext);
  const [canvasSize] = context.canvasSize;
  const [currentImageRatio, setCurrentImageRatio] = context.currentImageRatio;
  const [, setImageSize] = context.imageSize;
  const [, setImageCanvas] = context.imageCanvas;
  const [, setRenderingPayload] = context.renderingPayload;

  const canvas = (
    <canvas width={canvasSize()[0] * context.pixelRatio} height={canvasSize()[1] * context.pixelRatio} />
  ) as HTMLCanvasElement;
  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true
  });

  setImageCanvas(canvas);

  onMount(async() => {
    const payload = await initWebGL(gl, context);
    setRenderingPayload(payload);
    setImageSize([payload.image.width, payload.image.height]);
    if(!currentImageRatio()) setCurrentImageRatio(payload.image.width / payload.image.height);
  });

  createEffect(() => {
    drawAdjustedImage(gl);
  });

  return <>{canvas}</>;
}
