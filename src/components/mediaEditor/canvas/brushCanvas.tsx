import {createEffect, createMemo, createSignal, onCleanup, onMount, useContext} from 'solid-js';

import SwipeHandler, {getEvent} from '../../swipeHandler';
import throttle from '../../../helpers/schedulers/throttle';

import MediaEditorContext from '../context';

import BrushPainter, {BrushDrawnLine} from './brushPainter';
import getFinalTransform from './getFinalTransform';

const THROTTLE_MS = 25;

export default function BrushCanvas() {
  const context = useContext(MediaEditorContext);
  const [imageCanvas] = context.imageCanvas;
  const [canvasSize] = context.canvasSize;
  const [currentBrush] = context.currentBrush;
  const [currentTab] = context.currentTab;
  const [, setSelectedTextLayer] = context.selectedResizableLayer;
  const [lines, setLines] = context.brushDrawnLines;
  const [isAdjusting] = context.isAdjusting;

  const finalTransform = createMemo(getFinalTransform)

  function processLine(line: BrushDrawnLine): BrushDrawnLine {
    const transform = finalTransform()
    return {
      ...line,
      size: line.size * transform.scale,
      points: line.points.map(point => {
        const r = [Math.sin(-transform.rotation), Math.cos(-transform.rotation)]
        point = [
          point[0] * r[1] + point[1] * r[0],
          point[1] * r[1] - point[0] * r[0]
        ]
        point = [
          (point[0] * transform.scale + w / 2 + transform.translation[0]),
          (point[1] * transform.scale + h / 2 + transform.translation[1])
        ]
        return point
      })
    }
  }

  const processedLines = createMemo(() => lines().map(processLine))

  const [lastLine, setLastLine] = createSignal<BrushDrawnLine>();

  const w = canvasSize()[0] * context.pixelRatio,
    h = canvasSize()[1] * context.pixelRatio;

  const canvas = (
    <canvas
      class="media-editor__brush-canvas"
      classList={{
        'media-editor__brush-canvas--active': currentTab() === 'brush'
      }}
      style={{
        'opacity': isAdjusting() ? 0 : 1
      }}
      width={w}
      height={h}
    ></canvas>
  ) as HTMLCanvasElement;

  const brushPainter = new BrushPainter({
    imageCanvas: imageCanvas(),
    targetCanvas: canvas
  });

  function resetLastLine() {
    setLastLine({
      color: currentBrush().color,
      brush: currentBrush().brush,
      size: currentBrush().size / finalTransform().scale,
      points: []
    });
  }

  createEffect(() => {
    resetLastLine();
  });
  createEffect(() => {
    reDraw()
  })

  function reDraw() {
    brushPainter.clear();
    processedLines().forEach((line) => brushPainter.drawLine(line));
  }
  onMount(() => {
    reDraw();
  });
  createEffect(() => {
    if(isAdjusting() || currentTab() === 'crop') {
      onCleanup(() => {
        reDraw()
      })
    }
  })

  context.redrawBrushes = reDraw;
  onCleanup(() => {
    context.redrawBrushes = () => {}
  })

  onMount(() => {
    let initialPosition: [number, number];
    let points: [number, number][] = [];

    new SwipeHandler({
      element: canvas,
      cursor: '',
      onSwipe: throttle(
        (xDiff: number, yDiff: number, _e) => {
          if(!initialPosition) {
            const e = getEvent(_e);
            const bcr = canvas.getBoundingClientRect();
            initialPosition = [e.clientX - xDiff - bcr.left, e.clientY - yDiff - bcr.top];
            setSelectedTextLayer();
          }

          const transform = finalTransform()

          let point = [
            (initialPosition[0] + xDiff) * context.pixelRatio,
            (initialPosition[1] + yDiff) * context.pixelRatio
          ] as [number, number]

          point = [
            (point[0] - transform.translation[0] - w / 2) / transform.scale,
            (point[1] - transform.translation[1] - h / 2) / transform.scale
          ]
          const r = [Math.sin(transform.rotation), Math.cos(transform.rotation)]
          point = [
            point[0] * r[1] + point[1] * r[0],
            point[1] * r[1] - point[0] * r[0]
          ]

          points.push(point);

          setLastLine((prev) => ({...prev, points}));
          brushPainter.previewLine(processLine({...lastLine(), points}));
        },
        THROTTLE_MS,
        true
      ),
      onReset() {
        setTimeout(() => {
          const prevLines = [...lines()];
          const newLines = [...lines(), lastLine()];
          setLines(newLines);
          resetLastLine();
          brushPainter.saveLastLine();

          context.pushToHistory({
            undo() {
              setLines(prevLines);
              context.redrawBrushes();
            },
            redo() {
              setLines(newLines);
              context.redrawBrushes();
            }
          });

          points = [];
          initialPosition = undefined;
        }, THROTTLE_MS);
      }
    });
  });

  return <>{canvas}</>;
}
