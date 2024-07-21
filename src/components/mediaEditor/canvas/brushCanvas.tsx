import {createEffect, createSignal, onMount, useContext} from 'solid-js'
import MediaEditorContext from '../context'
import SwipeHandler, {getEvent} from '../../swipeHandler'
import throttle from '../../../helpers/schedulers/throttle'
import {hexaToRgba} from '../../../helpers/color'

export type BrushDrawnLine = {
  color: string
  brush: string
  size: number
  points: [number, number][]
}

const THROTTLE_MS = 25

export default function BrushCanvas() {
  const context = useContext(MediaEditorContext)
  const [imageCanvas] = context.imageCanvas
  const [canvasSize] = context.canvasSize
  const [currentBrush] = context.currentBrush
  const [currentTab] = context.currentTab
  const [, setSelectedTextLayer] = context.selectedResizableLayer
  const [lines, setLines] = context.brushDrawnLines

  const [lastLine, setLastLine] = createSignal<BrushDrawnLine>()

  const w = canvasSize()[0] * context.pixelRatio,
    h = canvasSize()[1] * context.pixelRatio;

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
      'media-editor__brush-canvas--active': currentTab() === 'brush'
    }}
    width={w}
    height={h}
  ></canvas> as HTMLCanvasElement

  const mainCtx = canvas.getContext('2d')
  const blurredImageCtx = blurredImageCanvas.getContext('2d')
  const blurredLineCtx = blurredLineCanvas.getContext('2d')

  function drawLine(line: BrushDrawnLine, ctx: CanvasRenderingContext2D) {
    const brushFn = brushes[line.brush]
    ctx.save()
    brushFn(line, ctx, {blurredLineCtx, image: blurredImageCanvas})
    ctx.restore()
  }


  function draw(lines: BrushDrawnLine[]) {
    mainCtx.clearRect(0, 0, w, h)
    blurredImageCtx.clearRect(0, 0, w, h)
    blurredImageCtx.filter = 'blur(10px)'
    blurredImageCtx.drawImage(imageCanvas(), 0, 0)

    lines.forEach(line => {
      drawLine(line, blurredImageCtx)
      drawLine(line, mainCtx)
    })
  }


  function resetLastLine() {
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
          setSelectedTextLayer()
        }

        points.push([
          (initialPosition[0] + xDiff) * context.pixelRatio,
          (initialPosition[1] + yDiff) * context.pixelRatio
        ])

        setLastLine(prev => ({...prev, points}))
        draw([...lines(), ({...lastLine(), points})])
      }, THROTTLE_MS, true),
      onReset() {
        setTimeout(() => {
          setLines(prev => [...prev, lastLine()])
          resetLastLine()

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

function drawLinePath(line: BrushDrawnLine, ctx: CanvasRenderingContext2D) {
  const {points} = line
  if(!points.length) return

  if(points.length === 1) {
    ctx.fillStyle = ctx.strokeStyle
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
  blurredLineCtx: CanvasRenderingContext2D
  image: HTMLCanvasElement
}

const brushes: Record<string, (line: BrushDrawnLine, ctx: CanvasRenderingContext2D, payload: BrushPayload) => void> = {
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
    ctx.strokeStyle = `rgba(${hexaToRgba(line.color).join(',')},0.4)`
    drawLinePath(line, ctx)
  },
  neon: (line, ctx) => {
    ctx.strokeStyle = '#ffffff'
    ctx.shadowBlur = line.size
    ctx.shadowColor = line.color
    drawLinePath(line, ctx)
  },
  blur: (line, ctx, payload) => {
    const {blurredLineCtx, image} = payload
    const w = ctx.canvas.width, h = ctx.canvas.height;

    blurredLineCtx.clearRect(0, 0, w, h)

    const {points} = line
    const pointsX = points.map(p => p[0])
    const pointsY = points.map(p => p[1])
    const
      minX = Math.min(...pointsX) - line.size,
      maxX = Math.max(...pointsX) + line.size,
      minY = Math.min(...pointsY) - line.size,
      maxY = Math.max(...pointsY) + line.size;

    blurredLineCtx.strokeStyle = 'white'
    drawLinePath(line, blurredLineCtx)
    blurredLineCtx.globalCompositeOperation = 'source-in'
    blurredLineCtx.drawImage(image, 0, 0)

    ctx.drawImage(blurredLineCtx.canvas, minX, minY, maxX, maxY, minX, minY, maxX, maxY)
    blurredLineCtx.globalCompositeOperation = 'source-over'
  },
  eraser: (line, ctx) => {
    ctx.strokeStyle = 'white'
    ctx.globalCompositeOperation = 'destination-out'
    drawLinePath(line, ctx)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }
}
