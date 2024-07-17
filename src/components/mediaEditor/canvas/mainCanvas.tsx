import {createEffect, createSignal, onCleanup, onMount, Show, useContext} from 'solid-js'
import MediaEditorContext from '../context'
import {initWebGL, RenderingPayload} from '../webgl/initWebGL'
import {draw} from '../webgl/draw'
import {AdjustmentsConfig} from '../adjustments'
import {getCropOffset} from './cropOffset'
import CropHandles from './cropHandles'
import RotationWheel from './rotationWheel'


function ImageCanvas() {
  const context = useContext(MediaEditorContext)
  const [canvasResolution] = context.canvasResolution
  const [isCroping] = context.isCroping
  const [currentImageRatio, setCurrentImageRatio] = context.currentImageRatio
  const [, setScale] = context.scale
  const [, setTranslation] = context.translation

  const canvas = (
    <canvas
      width={canvasResolution()[0] * context.pixelRatio}
      height={canvasResolution()[1] * context.pixelRatio}
    />) as HTMLCanvasElement
  const gl = canvas.getContext('webgl')

  const [renderingPayload, setRenderingPayload] = createSignal<RenderingPayload>()

  onMount(async() => {
    const payload = await initWebGL(gl, context)
    setRenderingPayload(payload)
    setCurrentImageRatio(payload.image.width / payload.image.height)
  })

  createEffect(() => {
    const payload = renderingPayload()
    if(!payload) return

    const cropOffset = getCropOffset()
    const [translation] = context.translation
    const [scale] = context.scale
    const [rotation] = context.rotation

    const [w,  h] = canvasResolution()

    const imageRatio = payload.image.width / payload.image.height
    let cropScale = 1

    let _cropScale: number
    if(cropOffset.width / imageRatio > cropOffset.height) _cropScale = cropOffset.height / h
    else _cropScale = cropOffset.width / w


    let cropSnappedWidth = cropOffset.width, cropSnappedHeight = cropOffset.height

    if(cropOffset.width / currentImageRatio() > cropOffset.height) cropSnappedWidth = cropOffset.height * currentImageRatio()
    else cropSnappedHeight = cropOffset.width / currentImageRatio()

    const fromCroppedScale = Math.min(w / cropSnappedWidth, h / cropSnappedHeight)


    const imageScale = Math.min(w / payload.image.width, h / payload.image.height)

    if(isCroping()) {
      cropScale = _cropScale
    } else {
      cropScale = fromCroppedScale * _cropScale
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
      rotation: rotation(),
      scale: scale() * context.pixelRatio * imageScale * cropScale,
      translation: [
        0 + cropTranslation[0] + translation()[0],
        0 + cropTranslation[1] + translation()[1]
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
  })

  return (
    <>{canvas}</>
  )
}

export default function MainCanvas(props: {}) {
  let container: HTMLDivElement
  const context = useContext(MediaEditorContext)
  const [canvasResolution, setCanvasResolution] = context.canvasResolution

  onMount(() => {
    const bcr = container.getBoundingClientRect()
    setCanvasResolution([bcr.width, bcr.height])
  })


  return (
    <div ref={container} class="media-editor__main-canvas">
      <Show when={canvasResolution()}>
        <ImageCanvas />
        <CropHandles />
        <RotationWheel />
      </Show>
    </div>
  )
}
