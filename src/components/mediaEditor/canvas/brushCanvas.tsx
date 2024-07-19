import {createEffect, createMemo, createSignal, onMount, useContext} from 'solid-js'
import MediaEditorContext from '../context'
import SwipeHandler, {getEvent} from '../../swipeHandler'
import throttle from '../../../helpers/schedulers/throttle'
import {hexaToRgba} from '../../../helpers/color'

type Line = {
  color: string
  brush: string
  size: number
  points: [number, number][]
}

const THROTTLE_MS = 25

export default function BrushCanvas() {
  const context = useContext(MediaEditorContext)
  const [imageCanvas] = context.imageCanvas
  const [canvasResolution] = context.canvasResolution
  const [currentBrush] = context.currentBrush
  const [lines, setLines] = createSignal<Line[]>([])
  const [lastLine, setLastLine] = createSignal<Line>()

  const w = canvasResolution()[0] * context.pixelRatio,
    h = canvasResolution()[1] * context.pixelRatio;

  const blurredImageCanvas = <canvas
    class="media-editor__brush-canvas media-editor__brush-canvas--invisible"
    width={w}
    height={h}
  ></canvas> as HTMLCanvasElement
  const blurredLineCanvas = <canvas
    class="media-editor__brush-canvas media-editor__brush-canvas--invisible"
    width={w}
    height={h}
  ></canvas> as HTMLCanvasElement
  const canvas = <canvas
    class="media-editor__brush-canvas"
    classList={{
      'media-editor__brush-canvas--active': true
    }}
    width={w}
    height={h}
  ></canvas> as HTMLCanvasElement

  const mainCtx = canvas.getContext('2d')
  const blurredImageCtx = blurredImageCanvas.getContext('2d')
  const blurredLineCtx = blurredLineCanvas.getContext('2d')


  const [image, setImage] = createSignal<HTMLImageElement>()

  const blurredImageData = createMemo(() => {
    if(!image()) return undefined
    // const imgCtx = imageCanvas().getContext('2d')
    // const imageData = imgCtx.getImageData(0, 0, w, h)

    blurredImageCtx.clearRect(0, 0, w, h)

    blurredImageCtx.filter = 'blur(20px)'
    blurredImageCtx.drawImage(image(), 0, 0, w, h)
    lines().forEach(line => drawLine(line, blurredImageCtx))

    return blurredImageCtx.getImageData(0, 0, w, h)
  })

  function drawLine(line: Line, ctx: CanvasRenderingContext2D) {
    const brushFn = brushes[line.brush]
    brushFn(line, ctx, {blurredImageData: blurredImageData(), blurredLineCtx})
  }

  // createEffect(() => {
  //   console.log('draw all lines effect');
  //   mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height)
  //   lines().forEach(line => drawLine(line, mainCtx))
  //   if(lastLine()) drawLine(lastLine(), mainCtx)
  // })

  function draw(line: Line) {
    requestAnimationFrame(() => {
      mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height)
      drawLine(line, mainCtx)
    })
  }

  onMount(() => {
    const image = new Image()
    image.onload = () => {
      // mainCtx.drawImage(imageCanvas(), 0, 0, w, h)
      setImage(image)
    }
    image.src = 'tmp/texture3.jpg'
  })

  function resetLastLine() {
    console.log('reset last line');
    setLastLine({
      color: currentBrush().color,
      brush: currentBrush().brush,
      size: currentBrush().size,
      points: []
    })
  }

  createEffect(() => {
    resetLastLine()
  })

  onMount(() => {
    let initialPosition: [number, number]
    let points: [number, number][] = []

    // return
    new SwipeHandler({
      element: canvas,
      onSwipe: throttle((xDiff, yDiff, _e) => {
        if(!initialPosition) {
          const e = getEvent(_e)
          const bcr = canvas.getBoundingClientRect()
          initialPosition = [
            e.clientX - bcr.left,
            e.clientY - bcr.top
          ]
        }

        points.push([
          (initialPosition[0] + xDiff) * context.pixelRatio,
          (initialPosition[1] + yDiff) * context.pixelRatio
        ])

        // setLastLine(prev => ({...prev, points}))
        draw(({
          ...lastLine(),
          points
        }))
      }, THROTTLE_MS, true),
      onReset() {
        setTimeout(() => {
          // setLines(prev => [...prev, lastLine()])
          // resetLastLine()

          points = []
          initialPosition = undefined
        }, THROTTLE_MS)
      }
    })
  })

  return (
    <>
      {blurredImageCanvas}
      {blurredLineCanvas}
      {canvas}
    </>
  )
}

function drawLinePath(line: Line, ctx: CanvasRenderingContext2D) {
  const {points} = line
  if(!points.length) return

  if(points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], line.size / 2, 0, 2 * Math.PI);
    ctx.fill();
    return
  }

  ctx.lineWidth = line.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])

  for(let i = 1; i < points.length - 2 ; i++) {
    const cx = (points[i][0] + points[i + 1][0]) / 2;
    const cy = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], cx, cy);
  }

  const i = points.length - 1
  ctx.quadraticCurveTo(
    points[i - 1][0],
    points[i - 1][1],
    points[i][0],
    points[i][1]
  )

  ctx.stroke()
}

type BrushPayload = {
  blurredImageData: ImageData
  blurredLineCtx: CanvasRenderingContext2D
}

const brushes: Record<string, (line: Line, ctx: CanvasRenderingContext2D, payload: BrushPayload) => void> = {
  pen: (line, ctx) => {
    ctx.strokeStyle = line.color
    drawLinePath(line, ctx)
  },
  arrow: (line, ctx) => {
    const {points} = line

    ctx.strokeStyle = line.color
    drawLinePath(line, ctx)

    if(points.length < 2) return

    const i = points.length - 1
    const i2 = Math.max(0, points.length - 8)
    const angle = Math.atan2(
      points[i][0] - points[i2][0],
      points[i][1] - points[i2][1]
    ) + Math.PI

    const arrowLen = 32 + line.size
    const angle1 = angle + Math.PI / 4
    const angle2 = angle - Math.PI / 4

    const vec1 = [
      arrowLen * Math.sin(angle1),
      arrowLen * Math.cos(angle1)
    ]
    const vec2 = [
      arrowLen * Math.sin(angle2),
      arrowLen * Math.cos(angle2)
    ]

    ctx.beginPath()
    ctx.moveTo(points[i][0], points[i][1])
    ctx.lineTo(points[i][0] + vec1[0], points[i][1] + vec1[1])
    ctx.moveTo(points[i][0], points[i][1])
    ctx.lineTo(points[i][0] + vec2[0], points[i][1] + vec2[1])
    ctx.stroke()
  },
  brush: (line, ctx) => {
    ctx.strokeStyle = `rgba(${hexaToRgba(line.color).join(',')},0.2)`
    drawLinePath(line, ctx)
  },
  neon: (line, ctx) => {
    ctx.strokeStyle = '#ffffff'
    ctx.shadowBlur = line.size * 2
    ctx.shadowColor = line.color
    drawLinePath(line, ctx)
  },
  blur: (line, ctx, payload) => {
    const {blurredImageData, blurredLineCtx} = payload
    const w = ctx.canvas.width, h = ctx.canvas.height;

    blurredLineCtx.save()
    blurredLineCtx.fillStyle = 'white'
    blurredLineCtx.rect(200, 200, 200, 200)
    blurredLineCtx.fill()
    blurredLineCtx.globalCompositeOperation = 'destination-out'
    blurredLineCtx.rect(250, 250, 200, 200)
    blurredLineCtx.fill()
    // blurredLineCtx.restore()
    // blurredLineCtx.putImageData(blurredImageData, 0, 0)

    ctx.putImageData(blurredLineCtx.getImageData(0, 0, w, h), 0, 0)

    return

    blurredLineCtx.clearRect(0, 0, w, h)

    const {points} = line
    const pointsX = points.map(p => p[0])
    const pointsY = points.map(p => p[1])
    const
      minX = Math.min(...pointsX) - line.size,
      maxX = Math.max(...pointsX) + line.size,
      minY = Math.min(...pointsY) - line.size,
      maxY = Math.max(...pointsY) + line.size;

    blurredLineCtx.save()
    blurredLineCtx.strokeStyle = 'white'
    drawLinePath(line, blurredLineCtx)
    blurredLineCtx.globalCompositeOperation = 'source-in'
    blurredLineCtx.putImageData(blurredImageData, minX, minY)

    const blurredLineImageData = blurredLineCtx.getImageData(minX, minY, maxX, maxY)
    ctx.putImageData(blurredLineImageData, minX, minY)

    blurredLineCtx.restore()
  },
  eraser: (line, ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0)'
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    drawLinePath(line, ctx)
    ctx.stroke()
    ctx.restore()
  }
}
