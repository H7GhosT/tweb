import {createEffect, onMount, Show, useContext} from 'solid-js'

import MediaEditorContext from '../context'
import {initWebGL} from '../webgl/initWebGL'
import {draw} from '../webgl/draw'
import {AdjustmentsConfig} from '../adjustments'

import {getCropOffset} from './cropOffset'
import CropHandles from './cropHandles'
import RotationWheel from './rotationWheel'
import ResizableLayers from './resizableLayers'
import BrushCanvas from './brushCanvas'


export function drawAdjustedImage(gl: WebGLRenderingContext, size?: [number, number]) {
  const context = useContext(MediaEditorContext)
  const [canvasSize] = context.canvasSize
  const [currentTab] = context.currentTab
  const [currentImageRatio] = context.currentImageRatio
  const [translation] = context.translation
  const [scale] = context.scale
  const [rotation] = context.rotation
  const [flip] = context.flip
  const [renderingPayload] = context.renderingPayload

  const isCroping = () => currentTab() === 'crop'

  const payload = renderingPayload()
  if(!payload) return

  const cropOffset = getCropOffset()

  const [w,  h] = size || canvasSize()

  const imageRatio = payload.image.width / payload.image.height

  let toCropScale = getSnappedViewportsScale(imageRatio, cropOffset.width, cropOffset.height, w, h)
  const fromCroppedScale = 1 / getSnappedViewportsScale(currentImageRatio(), cropOffset.width, cropOffset.height, w, h)

  const snappedImageScale = Math.min(w / payload.image.width, h / payload.image.height)

  if(!isCroping()) {
    toCropScale *= fromCroppedScale
  }

  let cropTranslation = [0, 0]
  if(isCroping()) {
    cropTranslation = [
      0,
      ((cropOffset.left + cropOffset.height / 2) - h / 2)
    ]
  } else {
    cropTranslation = translation().map(x => (x * fromCroppedScale - x))
  }

  draw(gl, payload, {
    flip: flip(),
    rotation: rotation(),
    scale: scale() * context.pixelRatio * snappedImageScale * toCropScale,
    translation: [
      cropTranslation[0] + translation()[0],
      cropTranslation[1] + translation()[1]
    ].map(v => v * context.pixelRatio) as [number, number],
    imageSize: [payload.image.width, payload.image.height],
    ...(
      Object.fromEntries(
        context.adjustments.map(({key, signal, to100}) => {
          const value = signal[0]()
          return [key, value / (to100 ? 100 : 50)]
        })
      ) as Record<AdjustmentsConfig[number]['key'], number>
    )
  })
}

function ImageCanvas() {
  const context = useContext(MediaEditorContext)
  const [canvasSize] = context.canvasSize
  const [, setCurrentImageRatio] = context.currentImageRatio
  const [, setImageSize] = context.imageSize
  const [, setImageCanvas] = context.imageCanvas
  const [, setRenderingPayload] = context.renderingPayload

  const canvas = (
    <canvas
      width={canvasSize()[0] * context.pixelRatio}
      height={canvasSize()[1] * context.pixelRatio}
    />) as HTMLCanvasElement
  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true
  })

  setImageCanvas(canvas)


  onMount(async() => {
    const payload = await initWebGL(gl, context)
    setRenderingPayload(payload)
    setCurrentImageRatio(payload.image.width / payload.image.height)
    setImageSize([payload.image.width, payload.image.height])
  })

  createEffect(() => {
    drawAdjustedImage(gl)
  })

  return (
    <>{canvas}</>
  )
}

export default function MainCanvas() {
  let container: HTMLDivElement
  const context = useContext(MediaEditorContext)
  const [canvasSize, setCanvasSize] = context.canvasSize

  onMount(() => {
    const bcr = container.getBoundingClientRect()
    setCanvasSize([bcr.width, bcr.height])
  })


  return (
    <div ref={container} class="media-editor__main-canvas">
      <Show when={canvasSize()}>
        <ImageCanvas />
        <BrushCanvas />
        <ResizableLayers />
        <CropHandles />
        <RotationWheel />
      </Show>
    </div>
  )
}

function getSnappedViewportsScale(ratio: number, vw1: number, vh1: number, vw2: number, vh2: number) {
  if(vw1 / ratio > vh1) vw1 = vh1 * ratio
  else vh1 = vw1 / ratio
  if(vw2 / ratio > vh2) vw2 = vh2 * ratio
  else vh2 = vw2 / ratio

  return Math.max(vw1 / vw2, vh1 / vh2)
}
