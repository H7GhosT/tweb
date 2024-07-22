import {createEffect, createSignal, onMount, useContext} from 'solid-js'

import SwipeHandler, {getEvent} from '../../swipeHandler'
import throttle from '../../../helpers/schedulers/throttle'

import MediaEditorContext from '../context'

import BrushPainter, {BrushDrawnLine} from './brushPainter'

const THROTTLE_MS = 25

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

  const brushPainter = new BrushPainter({
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
      cursor: '',
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
        brushPainter.previewLine({...lastLine(), points})
      }, THROTTLE_MS, true),
      onReset() {
        setTimeout(() => {
          setLines(prev => [...prev, lastLine()])
          resetLastLine()
          brushPainter.saveLastLine()

          points = []
          initialPosition = undefined
        }, THROTTLE_MS)
      }
    })
  })

  return (
    <>
      {canvas}
    </>
  )
}
