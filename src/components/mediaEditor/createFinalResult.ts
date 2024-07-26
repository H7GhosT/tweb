import {useContext} from 'solid-js'

import MediaEditorContext, {StandaloneContext} from './context'
import {AdjustmentsConfig} from './adjustments'
import {getSnappedViewportsScale, snapToViewport} from './math/viewports'
import {draw} from './webgl/draw'
import {initWebGL} from './webgl/initWebGL'
import BrushPainter from './canvas/brushPainter'
import {getCropOffset} from './canvas/cropOffset'
import {fontInfoMap, getContrastColor} from './utils'
import {ResizableLayer} from './types'

export type MediaEditorFinalResult = {
  blob: Blob
  width: number
  height: number
  originalSrc: string
  standaloneContext: StandaloneContext
}

export async function createFinalResult(standaloneContext: StandaloneContext) {
  const context = useContext(MediaEditorContext)
  const [canvasSize] = context.canvasSize
  const [currentImageRatio] = context.currentImageRatio
  const [translation] = context.translation
  const [scale] = context.scale
  const [rotation] = context.rotation
  const [flip] = context.flip
  const [resizableLayers] = context.resizableLayers
  const [textLayersInfo] = context.textLayersInfo
  const [stickersLayersInfo] = context.stickersLayersInfo
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
  const linePointScale = canvasScale / context.pixelRatio
  const scaledLines = lines().map(({size, points, ...line}) => ({
    ...line,
    size: size * linePointScale,
    points: points.map(point => [
      (point[0] - initialCanvasWidth * context.pixelRatio / 2) * linePointScale + scaledWidth / 2,
      (point[1] - initialCanvasHeight * context.pixelRatio / 2) * linePointScale + scaledHeight / 2
    ] as [number, number])
  }))

  const brushCanvas = document.createElement('canvas')
  brushCanvas.width = scaledWidth
  brushCanvas.height = scaledHeight

  const brushPainter = new BrushPainter({targetCanvas: brushCanvas, imageCanvas})
  scaledLines.forEach(line => brushPainter.drawLine(line))

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = scaledWidth
  resultCanvas.height = scaledHeight

  const ctx = resultCanvas.getContext('2d')
  ctx.drawImage(imageCanvas, 0, 0)
  ctx.drawImage(brushCanvas, 0, 0)

  const scaledLayers = resizableLayers().map(layerSignal => {
    const layer = {...layerSignal[0]()}
    layer.position = [
      (layer.position[0] - initialCanvasWidth / 2) * canvasScale + scaledWidth / 2,
      (layer.position[1] - initialCanvasHeight / 2) * canvasScale + scaledHeight / 2
    ]
    if(layer.textInfo) {
      layer.textInfo = {...layer.textInfo}
      layer.textInfo.size *= canvasScale * layer.scale
    }

    return layer
  })

  scaledLayers.forEach(layer => {
    if(layer.type === 'text') drawTextLayer(layer)
    if(layer.type === 'sticker') drawStickerLayer(layer)
  })

  function drawStickerLayer(layer: ResizableLayer) {
    const {container} = stickersLayersInfo()[layer.id]
    const stickerChild = container?.lastElementChild
    if(!stickerChild) return

    const STICKER_SIZE = 200
    const size = STICKER_SIZE * layer.scale * canvasScale

    ctx.save()
    ctx.translate(layer.position[0], layer.position[1])
    ctx.rotate(layer.rotation);

    const [w, h] = (() => {
      if(stickerChild instanceof HTMLImageElement) {
        const ratio = stickerChild.naturalWidth / stickerChild.naturalHeight
        return snapToViewport(ratio, size, size)
      } else if(stickerChild instanceof HTMLVideoElement) {
        const ratio = stickerChild.videoWidth / stickerChild.videoHeight
        return snapToViewport(ratio, size, size)
      } else return [size, size]
    })()

    ctx.drawImage(stickerChild as CanvasImageSource, -size / 2 + (size - w) / 2, - size / 2 + (size - h) / 2, w, h)

    ctx.restore()
  }

  function drawTextLayer(layer: ResizableLayer) {
    if(layer.type !== 'text') return
    const renderingInfo = {...textLayersInfo()[layer.id]}
    renderingInfo.height *= canvasScale * layer.scale
    renderingInfo.width *= canvasScale * layer.scale
    renderingInfo.lines = renderingInfo.lines.map(line => ({
      ...line,
      height: line.height * canvasScale * layer.scale,
      left: line.left * canvasScale * layer.scale,
      right: line.right * canvasScale * layer.scale
    }))

    if(renderingInfo.path) {
      const newPath = [...renderingInfo.path]
      function multiply(i: number) {
        newPath[i] = (newPath[i] as number) * canvasScale * layer.scale
      }
      newPath.forEach((part, i) => {
        if(part === 'M' || part === 'L') {
          multiply(i + 1)
          multiply(i + 2)
        } else if(part === 'A') {
          multiply(i + 1)
          multiply(i + 2)
          multiply(i + 6)
          multiply(i + 7)
        }
      })
      renderingInfo.path = newPath
    }

    ctx.save()
    ctx.translate(layer.position[0], layer.position[1])
    ctx.rotate(layer.rotation)

    let prevY = -renderingInfo.height / 2
    const boxLeft = -renderingInfo.width / 2
    const fontInfo = fontInfoMap[layer.textInfo.font]

    if(layer.textInfo.style === 'background') {
      ctx.translate(boxLeft, prevY)

      ctx.fillStyle = layer.textInfo.color
      const path = new Path2D(renderingInfo.path.join(' '))

      ctx.fill(path)
      ctx.translate(-boxLeft, -prevY)
    }

    renderingInfo.lines.forEach(line => {
      const yOffset = line.height * fontInfo.baseline
      let xOffset = 0.2 * layer.textInfo.size
      if(layer.textInfo.style === 'background') xOffset = 0.3 * layer.textInfo.size

      ctx.font = `${fontInfo.fontWeight} ${layer.textInfo.size}px ${fontInfo.fontFamily}`

      const x = boxLeft + xOffset + line.left, y = prevY + yOffset

      if(layer.textInfo.style === 'outline') {
        ctx.lineWidth = layer.textInfo.size * 0.15
        ctx.strokeStyle = layer.textInfo.color
        ctx.strokeText(line.content, x, y)
        ctx.fillStyle = getContrastColor(layer.textInfo.color)
        ctx.fillText(line.content, x, y)
      } else if(layer.textInfo.style === 'background') {
        ctx.fillStyle = getContrastColor(layer.textInfo.color)
        ctx.fillText(line.content, x, y)
      } else {
        ctx.fillStyle = layer.textInfo.color
        ctx.fillText(line.content, x, y)
      }
      prevY += line.height
    })

    ctx.restore()
  }

  return new Promise<MediaEditorFinalResult>((resolve) => {
    resultCanvas.toBlob(blob => resolve({
      blob,
      width: scaledWidth,
      height: scaledHeight,
      originalSrc: context.imageSrc,
      standaloneContext
    }))
  })
}
