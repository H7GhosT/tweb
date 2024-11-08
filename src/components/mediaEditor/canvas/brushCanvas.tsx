import {createEffect, createMemo, createSignal, on, onCleanup, onMount, useContext} from 'solid-js';

import SwipeHandler from '../../swipeHandler';

import MediaEditorContext from '../context';

import BrushPainter, {BrushDrawnLine} from './brushPainter';
import useNormalizePoint from './useNormalizePoint';
import useProcessPoint from './useProcessPoint';

const REPLACE_LAST_POINT_TIMEOUT_MS = 25;

export default function BrushCanvas() {
  const context = useContext(MediaEditorContext);
  const [imageCanvas] = context.imageCanvas;
  const [canvasSize] = context.canvasSize;
  const [currentBrush] = context.currentBrush;
  const [currentTab] = context.currentTab;
  const [, setSelectedTextLayer] = context.selectedResizableLayer;
  const [lines, setLines] = context.brushDrawnLines;
  const [isAdjusting] = context.isAdjusting;
  const [finalTransform] = context.finalTransform

  const normalizePoint = useNormalizePoint();
  const processPoint = useProcessPoint()

  function processLine(line: BrushDrawnLine): BrushDrawnLine {
    const transform = finalTransform()
    return {
      ...line,
      size: line.size * transform.scale,
      points: line.points.map(processPoint)
    }
  }

  const processedLines = createMemo(() => lines().map(processLine))

  const [lastLine, setLastLine] = createSignal<BrushDrawnLine>();

  const canvas = (
    <canvas
      class="media-editor__brush-canvas"
      classList={{
        'media-editor__brush-canvas--active': currentTab() === 'brush'
      }}
      style={{
        'opacity': isAdjusting() ? 0 : 1
      }}
      width={canvasSize()[0] * context.pixelRatio}
      height={canvasSize()[1] * context.pixelRatio}
    ></canvas>
  ) as HTMLCanvasElement;

  let brushPainter = new BrushPainter({
    imageCanvas: imageCanvas(),
    targetCanvas: canvas
  });

  createEffect(on(canvasSize, () => {
    brushPainter = new BrushPainter({
      imageCanvas: imageCanvas(),
      targetCanvas: canvas
    });
    reDraw();
  }));

  function resetLastLine() {
    setLastLine({
      color: currentBrush().color,
      brush: currentBrush().brush,
      size: currentBrush().size * context.pixelRatio / finalTransform().scale,
      points: []
    });
  }

  createEffect(() => {
    resetLastLine();
  });
  createEffect(() => {
    reDraw()
  });

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

    let shouldReplaceLastPoint = false;

    function saveLastLine() {
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
    }

    function startSwipe(x: number, y: number) {
      const bcr = canvas.getBoundingClientRect();

      initialPosition = [x - bcr.left, y - bcr.top];
      const point = normalizePoint(initialPosition);
      points = [point];

      setLastLine((prev) => ({...prev, points}));
      brushPainter.previewLine(processLine(lastLine()));

      setSelectedTextLayer();
    }

    function endSwipe() {
      if(points.length === 1) {
        saveLastLine();
      }
    }

    canvas.addEventListener('mousedown', (e) => {
      startSwipe(e.clientX, e.clientY);
    });
    canvas.addEventListener('touchstart', (e) => {
      startSwipe(e.touches[0].clientX, e.touches[0].clientY);
    });

    canvas.addEventListener('mouseup', () => {
      endSwipe();
    });
    canvas.addEventListener('touchend', () => {
      endSwipe();
    });


    new SwipeHandler({
      element: canvas,
      cursor: '',
      onSwipe: (xDiff, yDiff, _e) => {
        const point = normalizePoint([
          (initialPosition[0] + xDiff),
          (initialPosition[1] + yDiff)
        ]);

        if(shouldReplaceLastPoint) {
          points[points.length - 1] = point;
        } else {
          points.push(point);
          shouldReplaceLastPoint = true;
          setTimeout(() => {
            shouldReplaceLastPoint = false
          }, REPLACE_LAST_POINT_TIMEOUT_MS)
        }

        setLastLine((prev) => ({...prev, points}));
        brushPainter.previewLine(processLine(lastLine()));
      },
      onReset() {
        setTimeout(() => {
          saveLastLine();
        }, REPLACE_LAST_POINT_TIMEOUT_MS);
      }
    });
  });

  return <>{canvas}</>;
}
