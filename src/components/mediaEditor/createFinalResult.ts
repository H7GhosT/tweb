import {useContext} from 'solid-js';

import MediaEditorContext, {StandaloneContext} from './context';
import {AdjustmentsConfig} from './adjustments';
import {delay, getSnappedViewportsScale, snapToViewport} from './utils';
import {draw} from './webgl/draw';
import {initWebGL} from './webgl/initWebGL';
import BrushPainter from './canvas/brushPainter';
import {getCropOffset} from './canvas/cropOffset';
import {fontInfoMap, getContrastColor} from './utils';
import {ResizableLayer} from './types';
import {StickerFrameByFrameRenderer} from './finalRender/types';
import ImageStickerFrameByFrameRenderer from './finalRender/imageStickerFrameByFrameRenderer';
import LottieStickerFrameByFrameRenderer from './finalRender/lottieStickerFrameByFrameRenderer';
import VideoStickerFrameByFrameRenderer from './finalRender/videoStickerFrameByFrameRenderer';
import {FRAMES_PER_SECOND} from './finalRender/constants';
// import {createFFmpeg} from '@ffmpeg/ffmpeg';
// import Whammy from '../../vendor/whammy';
import deferredPromise from '../../helpers/cancellablePromise';

export type MediaEditorFinalResult = {
  blob: Blob;
  width: number;
  height: number;
  originalSrc: string;
  standaloneContext: StandaloneContext;
};


const STICKER_SIZE = 200;

export async function createFinalResult(standaloneContext: StandaloneContext) {
  const context = useContext(MediaEditorContext);
  const [canvasSize] = context.canvasSize;
  const [currentImageRatio] = context.currentImageRatio;
  const [translation] = context.translation;
  const [scale] = context.scale;
  const [rotation] = context.rotation;
  const [flip] = context.flip;
  const [resizableLayers] = context.resizableLayers;
  const [textLayersInfo] = context.textLayersInfo;
  const [stickersLayersInfo] = context.stickersLayersInfo;
  const [renderingPayload] = context.renderingPayload;

  const cropOffset = getCropOffset();

  const initialCanvasWidth = canvasSize()[0];
  const initialCanvasHeight = canvasSize()[1];

  const imageWidth = renderingPayload().image.width;
  const imageRatio = renderingPayload().image.width / renderingPayload().image.height;

  const newRatio = currentImageRatio();

  const SIDE_MAX = 2560;
  const SIDE_MIN = 100;
  let scaledWidth = imageWidth / scale(),
    scaledHeight = scaledWidth / newRatio;

  if(Math.max(scaledWidth, scaledHeight) > SIDE_MAX) {
    [scaledWidth, scaledHeight] = snapToViewport(newRatio, SIDE_MAX, SIDE_MAX);
  }
  if(Math.max(scaledWidth, scaledHeight) < SIDE_MIN) {
    [scaledWidth, scaledHeight] = snapToViewport(newRatio, SIDE_MIN, SIDE_MIN);
  }

  const canvasRatio = initialCanvasWidth / initialCanvasHeight;
  let snappedCanvasWidth = scaledWidth,
    snappedCanvasHeight = scaledHeight;
  if(scaledWidth / canvasRatio < scaledHeight) snappedCanvasWidth = scaledHeight * canvasRatio;
  else snappedCanvasHeight = scaledWidth / canvasRatio;

  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = scaledWidth;
  imageCanvas.height = scaledHeight;
  const gl = imageCanvas.getContext('webgl', {
    preserveDrawingBuffer: true
  });

  const payload = await initWebGL(gl, context);

  let toCropScale = getSnappedViewportsScale(
    imageRatio,
    cropOffset.width,
    cropOffset.height,
    snappedCanvasWidth,
    snappedCanvasHeight
  );
  const fromCroppedScale =
    1 /
    getSnappedViewportsScale(
      currentImageRatio(),
      cropOffset.width,
      cropOffset.height,
      snappedCanvasWidth,
      snappedCanvasHeight
    );

  toCropScale *= fromCroppedScale;

  const snappedImageScale = Math.min(
    snappedCanvasWidth / payload.image.width,
    snappedCanvasHeight / payload.image.height
  );

  const cropTranslation = translation().map((x) => x * fromCroppedScale - x);

  const finalTransform = {
    flip: flip(),
    rotation: rotation(),
    scale: scale() * snappedImageScale * toCropScale,
    translation: [cropTranslation[0] + translation()[0], cropTranslation[1] + translation()[1]] as [number, number]
  } as const;

  draw(gl, payload, {
    ...finalTransform,
    imageSize: [payload.image.width, payload.image.height],
    ...(Object.fromEntries(
      context.adjustments.map(({key, signal, to100}) => {
        const value = signal[0]();
        return [key, value / (to100 ? 100 : 50)];
      })
    ) as Record<AdjustmentsConfig[number]['key'], number>)
  });

  const [lines] = context.brushDrawnLines;

  function processPoint(point: [number, number]) {
    const r = [Math.sin(-finalTransform.rotation), Math.cos(-finalTransform.rotation)];
    point = [
      point[0] * r[1] + point[1] * r[0],
      point[1] * r[1] - point[0] * r[0]
    ];
    point = [
      (point[0] * finalTransform.scale + scaledWidth / 2 + finalTransform.translation[0]),
      (point[1] * finalTransform.scale + scaledHeight / 2 + finalTransform.translation[1])
    ];
    return point;
  }

  const scaledLines = lines().map(({size, points, ...line}) => ({
    ...line,
    size: size * finalTransform.scale,
    points: points.map(processPoint)
  }));

  const brushCanvas = document.createElement('canvas');
  brushCanvas.width = scaledWidth;
  brushCanvas.height = scaledHeight;

  const brushPainter = new BrushPainter({targetCanvas: brushCanvas, imageCanvas});
  scaledLines.forEach((line) => brushPainter.drawLine(line));

  const scaledLayers = resizableLayers().map((layerSignal) => {
    const layer = {...layerSignal[0]()};
    layer.position = processPoint(layer.position);
    layer.rotation += finalTransform.rotation;
    layer.scale *= finalTransform.scale;

    if(layer.textInfo) {
      layer.textInfo = {...layer.textInfo};
      layer.textInfo.size *= finalTransform.scale * layer.scale;
    }

    return layer;
  });

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = scaledWidth;
  resultCanvas.height = scaledHeight;
  const ctx = resultCanvas.getContext('2d', {willReadFrequently: true});

  if(scaledLayers.find(layer => [2, 3].includes(layer.sticker?.sticker))) {
    const renderers = new Map<number, StickerFrameByFrameRenderer>();

    let maxFrames = 0;

    console.log('HERE start');

    await Promise.all(scaledLayers.map(async(layer) => {
      if(!layer.sticker) return;

      const stickerType = layer.sticker?.sticker;
      let renderer: StickerFrameByFrameRenderer

      if(stickerType === 1) renderer = new ImageStickerFrameByFrameRenderer
      if(stickerType === 2) renderer = new LottieStickerFrameByFrameRenderer
      if(stickerType === 3) renderer = new VideoStickerFrameByFrameRenderer
      if(!renderer) return;

      renderers.set(layer.id, renderer)
      await renderer.init(layer.sticker!, STICKER_SIZE * layer.scale);
      maxFrames = Math.max(maxFrames, renderer.getTotalFrames());
    }));
    console.log('HERE inited all');

    // maxFrames = 25
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    // const ffmpeg = createFFmpeg({log: true})
    // const encoder = new Whammy.Video(25);

    // ffmpeg.on('log', ({message}) => {
    //   // messageRef.current.innerHTML = message;
    //   console.log('message', message);
    // });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    console.log('HERE ffmpeg created');
    // await ffmpeg.load()
    // await ffmpeg.load(
    // coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    // wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
    // );
    // await delay(2000)
    console.log('HERE ffmpeg loaded');


    const gifDelay = 1000 / FRAMES_PER_SECOND;

    const gif = new GIF({
      quality: 15,
      workers: 4,
      width: scaledWidth,
      height: scaledHeight
    });

    for(let frame = 0; frame <= maxFrames; frame++) {
      console.log('Rendering frame', frame);
      const promises = Array.from(renderers.values()).map(renderer => renderer.renderFrame(frame % (renderer.getTotalFrames() + 1)));
      await Promise.all(promises);

      ctx.clearRect(0, 0, scaledWidth, scaledHeight);
      ctx.drawImage(imageCanvas, 0, 0);
      ctx.drawImage(brushCanvas, 0, 0);

      scaledLayers.forEach((layer) => {
        if(layer.type === 'text') drawTextLayer(layer);
        if(layer.type === 'sticker' && renderers.has(layer.id)) {
          const renderer = renderers.get(layer.id);
          drawStickerLayer(layer, renderer.getRenderedFrame(), renderer.getRatio());
        }
      });

      const blob = await new Promise<Blob>(resolve => resultCanvas.toBlob(resolve, 'image/jpeg'))
      if(!blob) return;
      const frameBuffer = new Uint8Array(await blob.arrayBuffer());
      // ffmpeg.writeFile(`frame${frame}.jpg`, frameBuffer);
      // ffmpeg.FS('writeFile', `frame${frame}.jpg`, frameBuffer);
      // encoder.add(ctx)

      // frames.push()
      gif.addFrame(ctx, {copy: true, delay: gifDelay});
    }

    // await ffmpeg.exec([
    //   '-framerate', FRAMES_PER_SECOND.toString(),
    //   '-i', 'frame%d.jpg',
    //   '-c:v', 'libx264',
    //   '-pix_fmt', 'yuv420p',
    //   'output.mp4'
    // ]);
    // await ffmpeg.run(
    //   '-framerate', FRAMES_PER_SECOND.toString(),
    //   '-i', 'frame%d.jpg',
    //   '-c:v', 'libx264',
    //   '-pix_fmt', 'yuv420p',
    //   'output.mp4'
    // );

    // // const data = await ffmpeg.readFile('output.mp4');
    // const data = ffmpeg.FS('readFile', 'output.mp4');

    const deferred = deferredPromise<Blob>()

    // encoder.compile(false, (blob) => {
    //   deferred.resolve(blob)
    // })

    // const data = await deferred
    // console.log('HERE finish');

    // console.log('data', data)

    // const div = document.createElement('div')
    // div.style.position = 'fixed';
    // div.style.zIndex = '1000';
    // div.style.top = '50%';
    // div.style.left = '50%';
    // div.style.transform = 'translate(-50%, -50%)';
    // const img = document.createElement('video')
    // // img.src = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], {type: 'video/mp4'}));
    // img.src = URL.createObjectURL(data);
    // // img.autoplay = true
    // img.controls = true
    // img.style.maxWidth = '450px'
    // div.append(img)
    // document.body.append(div)

    gif.on('progress', (progress: number) => {
      console.log('progress', progress)
    })

    gif.on('finished', image => {
      deferred.resolve(image)
      console.log('HERE finish');
      return
      const div = document.createElement('div')
      div.style.position = 'fixed';
      div.style.zIndex = '1000';
      div.style.top = '50%';
      div.style.left = '50%';
      div.style.transform = 'translate(-50%, -50%)';
      const img = new Image()
      img.src = URL.createObjectURL(image)
      img.style.maxWidth = '450px'
      div.append(img)
      document.body.append(div)
    })

    gif.render()
    console.log('HERE started render');

    const blob = await deferred

    return {
      blob,
      width: scaledWidth,
      height: scaledHeight,
      originalSrc: context.imageSrc,
      standaloneContext
    }
  }

  ctx.drawImage(imageCanvas, 0, 0);
  ctx.drawImage(brushCanvas, 0, 0);


  scaledLayers.forEach((layer) => {
    if(layer.type === 'text') drawTextLayer(layer);
    if(layer.type === 'sticker' && layer.sticker?.sticker === 1) {
      const {container} = stickersLayersInfo()[layer.id];
      const stickerChild = container?.lastElementChild;
      if(!(stickerChild instanceof HTMLImageElement)) return;
      const ratio = stickerChild.naturalWidth / stickerChild.naturalHeight;
      drawStickerLayer(layer, stickerChild, ratio);
    }
  });

  function drawStickerLayer(layer: ResizableLayer, source: CanvasImageSource, ratio: number) {
    const {container} = stickersLayersInfo()[layer.id];
    const stickerChild = container?.lastElementChild;
    if(!stickerChild) return;

    const size = STICKER_SIZE * layer.scale;

    ctx.save();
    ctx.translate(layer.position[0], layer.position[1]);
    ctx.rotate(layer.rotation);

    const [w, h] = snapToViewport(ratio, size, size);

    ctx.drawImage(source, -size / 2 + (size - w) / 2, -size / 2 + (size - h) / 2, w, h);

    ctx.restore();
  }

  function drawTextLayer(layer: ResizableLayer) {
    if(layer.type !== 'text') return;
    const renderingInfo = {...textLayersInfo()[layer.id]};
    renderingInfo.height *= layer.scale;
    renderingInfo.width *= layer.scale;
    renderingInfo.lines = renderingInfo.lines.map((line) => ({
      ...line,
      height: line.height * layer.scale,
      left: line.left * layer.scale,
      right: line.right * layer.scale
    }));

    if(renderingInfo.path) {
      const newPath = [...renderingInfo.path];
      function multiply(i: number) {
        newPath[i] = (newPath[i] as number) * layer.scale;
      }
      newPath.forEach((part, i) => {
        if(part === 'M' || part === 'L') {
          multiply(i + 1);
          multiply(i + 2);
        } else if(part === 'A') {
          multiply(i + 1);
          multiply(i + 2);
          multiply(i + 6);
          multiply(i + 7);
        }
      });
      renderingInfo.path = newPath;
    }

    ctx.save();
    ctx.translate(layer.position[0], layer.position[1]);
    ctx.rotate(layer.rotation);

    let prevY = -renderingInfo.height / 2;
    const boxLeft = -renderingInfo.width / 2;
    const fontInfo = fontInfoMap[layer.textInfo.font];

    if(layer.textInfo.style === 'background') {
      ctx.translate(boxLeft, prevY);

      ctx.fillStyle = layer.textInfo.color;
      const path = new Path2D(renderingInfo.path.join(' '));

      ctx.fill(path);
      ctx.translate(-boxLeft, -prevY);
    }

    renderingInfo.lines.forEach((line) => {
      const yOffset = line.height * fontInfo.baseline;
      let xOffset = 0.2 * layer.textInfo.size;
      if(layer.textInfo.style === 'background') xOffset = 0.3 * layer.textInfo.size;

      ctx.font = `${fontInfo.fontWeight} ${layer.textInfo.size}px ${fontInfo.fontFamily}`;

      const x = boxLeft + xOffset + line.left,
        y = prevY + yOffset;

      if(layer.textInfo.style === 'outline') {
        ctx.lineWidth = layer.textInfo.size * 0.15;
        ctx.strokeStyle = layer.textInfo.color;
        ctx.strokeText(line.content, x, y);
        ctx.fillStyle = getContrastColor(layer.textInfo.color);
        ctx.fillText(line.content, x, y);
      } else if(layer.textInfo.style === 'background') {
        ctx.fillStyle = getContrastColor(layer.textInfo.color);
        ctx.fillText(line.content, x, y);
      } else {
        ctx.fillStyle = layer.textInfo.color;
        ctx.fillText(line.content, x, y);
      }
      prevY += line.height;
    });

    ctx.restore();
  }

  return new Promise<MediaEditorFinalResult>((resolve) => {
    resultCanvas.toBlob((blob) =>
      resolve({
        blob,
        width: scaledWidth,
        height: scaledHeight,
        originalSrc: context.imageSrc,
        standaloneContext
      })
    );
  });
}

/*
  // const gif = new GIF({
  //   quality: 15,
  //   workers: 4,
  //   width: 400,
  //   height: 400
  // })
  // const canvas = document.createElement('canvas')
  // canvas.width = 400
  // canvas.height = 400
  // const ctx = canvas.getContext('2d')
  // const delay = Math.round(1000 / 30)
  // const frames = 20
  // for(let i = 0; i < frames; i++) {
  //   ctx.clearRect(0, 0, 400, 400)
  //   ctx.fillStyle = 'red'
  //   ctx.fillRect(i * 10, i * 10, 150, 150)
  //   gif.addFrame(ctx, {copy: true, delay})
  // }
  // gif.on('finished', (image) => {
  //   console.log('HERE 2');
  //   console.timeEnd('gif rendering4')
  //   const img = <img src={URL.createObjectURL(image)} style={{
  //     'position': 'fixed',
  //     'left': '50%',
  //     'top': '50%',
  //     'transform': 'translate(-50%, -50%)',
  //     'z-index': 1000
  //   }} /> as HTMLImageElement;
  //   document.body.append(img)
  // })
  // gif.render()
*/
