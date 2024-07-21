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


type BrushRendererOptions = {
  targetCanvas: HTMLCanvasElement
  imageCanvas: HTMLCanvasElement
}

export class BrushRenderer {
  private imageCanvas: HTMLCanvasElement
  private cacheCanvas: HTMLCanvasElement
  private blurredImageCanvas: HTMLCanvasElement
  private blurredLineCanvas: HTMLCanvasElement
  private targetCtx: CanvasRenderingContext2D
  private cacheCtx: CanvasRenderingContext2D
  private blurredImageCtx: CanvasRenderingContext2D
  private blurredLineCtx: CanvasRenderingContext2D

  private width: number
  private height: number

  constructor({targetCanvas, imageCanvas}: BrushRendererOptions) {
    this.targetCtx = targetCanvas.getContext('2d')
    this.imageCanvas = imageCanvas

    this.cacheCanvas = document.createElement('canvas')
    this.blurredImageCanvas = document.createElement('canvas')
    this.blurredLineCanvas = document.createElement('canvas')

    this.width = this.cacheCanvas.width = this.blurredImageCanvas.width = this.blurredLineCanvas.width = targetCanvas.width
    this.height = this.cacheCanvas.height = this.blurredImageCanvas.height = this.blurredLineCanvas.height = targetCanvas.height

    this.cacheCtx = this.cacheCanvas.getContext('2d')
    this.blurredImageCtx = this.blurredImageCanvas.getContext('2d')
    this.blurredLineCtx = this.blurredLineCanvas.getContext('2d')
  }

  previewLine(line: BrushDrawnLine) {
    this.targetCtx.clearRect(0, 0, this.width, this.height)

    if(line.brush === 'blur') {
      this.blurredImageCtx.clearRect(0, 0, this.width, this.height)
      this.blurredImageCtx.filter = 'blur(10px)'
      this.blurredImageCtx.drawImage(this.imageCanvas, 0, 0)
      this.blurredImageCtx.drawImage(this.cacheCanvas, 0, 0)
    }

    this.targetCtx.drawImage(this.cacheCanvas, 0, 0)
    const brushFn = brushes[line.brush]
    this.targetCtx.save()
    brushFn(line, this.targetCtx, {blurredLineCtx: this.blurredLineCtx, image: this.blurredImageCanvas})
    this.targetCtx.restore()
  }

  saveLastLine() {
    this.cacheCtx.clearRect(0, 0, this.width, this.height)
    this.cacheCtx.drawImage(this.targetCtx.canvas, 0, 0)
  }

  drawLine(line: BrushDrawnLine) {
    this.previewLine(line)
    this.saveLastLine()
  }
}

export default function BrushCanvas() {
  const context = useContext(MediaEditorContext)
  const [imageCanvas] = context.imageCanvas
  const [canvasSize] = context.canvasSize
  const [currentBrush] = context.currentBrush
  const [currentTab] = context.currentTab
  const [, setSelectedTextLayer] = context.selectedResizableLayer
  const [, setLines] = context.brushDrawnLines


  const [lastLine, setLastLine] = createSignal<BrushDrawnLine>()

  const w = canvasSize()[0] * context.pixelRatio,
    h = canvasSize()[1] * context.pixelRatio;

  const canvas = <canvas
    class="media-editor__brush-canvas"
    classList={{
      'media-editor__brush-canvas--active': currentTab() === 'brush'
    }}
    width={w}
    height={h}
  ></canvas> as HTMLCanvasElement

  const brushRenderer = new BrushRenderer({
    imageCanvas: imageCanvas(),
    targetCanvas: canvas
  })


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
        brushRenderer.previewLine({...lastLine(), points})
        // draw([...lines(), ({...lastLine(), points})])
      }, THROTTLE_MS, true),
      onReset() {
        setTimeout(() => {
          setLines(prev => [...prev, lastLine()])
          resetLastLine()
          brushRenderer.saveLastLine()

          points = []
          initialPosition = undefined
        }, THROTTLE_MS)
      }
    })
  })

  return (
    <>
      {/* {blurredImageCanvas} */}
      {/* {blurredLineCanvas} */}
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

    let i2 = i
    for(; i2 > 0; i2--) {
      if(distanceBetween(points[i], points[i2]) > line.size * 1.5) break;
    }

    const angle = Math.atan2(
      points[i][0] - points[i2][0],
      points[i][1] - points[i2][1]
    ) + Math.PI

    const arrowLen = line.size * 5
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


function distanceBetween(p1: [number, number], p2: [number, number]) {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
}
