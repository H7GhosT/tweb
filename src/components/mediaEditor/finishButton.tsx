import {onMount, useContext} from 'solid-js'
import ripple from '../ripple'
import MediaEditorContext from './context'
import {getCropOffset} from './canvas/cropOffset'
import {AdjustmentsConfig} from './adjustments'
import {draw} from './webgl/draw'
import {withCurrentOwner} from './utils'
import {initWebGL} from './webgl/initWebGL'
import {BrushRenderer} from './canvas/brushCanvas'

export default function FinishButton(props: {
  onClick: () => void
}) {
  let container: HTMLDivElement

  onMount(() => {
    ripple(container)
  })

  return (
    <div ref={container} onClick={withCurrentOwner(async() => {
      const result = await createResult()
      const div = document.createElement('div')
      div.classList.add('center-absolute-canvas')
      div.append(result)
      document.body.append(div)
    })} class="media-editor__finish-button">
      <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 9L6.5 14L16 2" stroke="white" stroke-width="2.66" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  )
}


async function createResult() {
  const context = useContext(MediaEditorContext)
  const [canvasSize] = context.canvasSize
  const [currentImageRatio] = context.currentImageRatio
  const [translation] = context.translation
  const [scale] = context.scale
  const [rotation] = context.rotation
  const [flip] = context.flip
  // const [imageCanvas] = context.imageCanvas
  const [renderingPayload] = context.renderingPayload
  const cropOffset = getCropOffset()

  const initialCanvasWidth = canvasSize()[0]
  const initialCanvasHeight = canvasSize()[1]

  const imageWidth = renderingPayload().image.width
  const imageRatio = renderingPayload().image.width / renderingPayload().image.height

  const newRatio = currentImageRatio()


  const SIDE_MAX = 2560;
  const SIDE_MIN = 100;
  let scaledWidth = imageWidth / scale(), scaledHeight = scaledWidth / newRatio

  if(Math.max(scaledWidth, scaledHeight) > SIDE_MAX) {
    [scaledWidth, scaledHeight] = snapToViewport(newRatio, SIDE_MAX, SIDE_MAX)
  }
  if(Math.max(scaledWidth, scaledHeight) < SIDE_MIN) {
    [scaledWidth, scaledHeight] = snapToViewport(newRatio, SIDE_MIN, SIDE_MIN)
  }

  const canvasRatio = initialCanvasWidth / initialCanvasHeight
  let snappedCanvasWidth = scaledWidth, snappedCanvasHeight = scaledHeight
  if(scaledWidth / canvasRatio < scaledHeight) snappedCanvasWidth = scaledHeight * canvasRatio
  else snappedCanvasHeight = scaledWidth / canvasRatio

  const imageCanvas = document.createElement('canvas')
  imageCanvas.width = scaledWidth
  imageCanvas.height = scaledHeight
  const gl = imageCanvas.getContext('webgl')

  const payload = await initWebGL(gl, context)


  let toCropScale = getSnappedViewportsScale(imageRatio, cropOffset.width, cropOffset.height, snappedCanvasWidth, snappedCanvasHeight)
  const fromCroppedScale = 1 / getSnappedViewportsScale(currentImageRatio(), cropOffset.width, cropOffset.height, snappedCanvasWidth, snappedCanvasHeight)

  toCropScale *= fromCroppedScale

  const snappedImageScale = Math.min(snappedCanvasWidth / payload.image.width, snappedCanvasHeight / payload.image.height)

  const cropTranslation = translation().map(x => (x * fromCroppedScale - x))

  draw(gl, payload, {
    flip: flip(),
    rotation: rotation(),
    scale: scale() * snappedImageScale * toCropScale,
    translation: [
      cropTranslation[0] + translation()[0],
      cropTranslation[1] + translation()[1]
    ],
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

  const [lines] = context.brushDrawnLines

  const canvasScale = snappedCanvasWidth / initialCanvasWidth
  const scaledLines = lines().map(({size, points, ...line}) => ({
    ...line,
    size: size * canvasScale,
    points: points.map(point => [
      (point[0] - initialCanvasWidth / 2) * canvasScale + scaledWidth / 2,
      (point[1] - initialCanvasHeight / 2) * canvasScale + scaledHeight / 2
    ] as [number, number])
  }))

  const linesCanvas = document.createElement('canvas')
  linesCanvas.width = scaledWidth
  linesCanvas.height = scaledHeight
  console.log('lines()', lines())
  const brushRenderer = new BrushRenderer({targetCanvas: linesCanvas, imageCanvas})
  scaledLines.forEach(line => brushRenderer.drawLine(line))

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = scaledWidth
  resultCanvas.height = scaledHeight

  const ctx = resultCanvas.getContext('2d')
  ctx.drawImage(imageCanvas, 0, 0)
  ctx.drawImage(linesCanvas, 0, 0)

  return resultCanvas
}


function snapToViewport(ratio: number, vw: number, vh: number) {
  if(vw / ratio > vh) vw = vh * ratio
  else vh = vw / ratio

  return [vw, vh]
}

function getSnappedViewportsScale(ratio: number, vw1: number, vh1: number, vw2: number, vh2: number) {
  if(vw1 / ratio > vh1) vw1 = vh1 * ratio
  else vh1 = vw1 / ratio
  if(vw2 / ratio > vh2) vw2 = vh2 * ratio
  else vh2 = vw2 / ratio

  return Math.max(vw1 / vw2, vh1 / vh2)
}
