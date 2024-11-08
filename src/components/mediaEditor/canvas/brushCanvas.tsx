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
  const [imageSize] = context.imageSize;
  const [canvasSize] = context.canvasSize;
  const [currentBrush] = context.currentBrush;
  const [currentTab] = context.currentTab;
  const [, setSelectedTextLayer] = context.selectedResizableLayer;
  const [lines, setLines] = context.brushDrawnLines;
  const [isAdjusting] = context.isAdjusting;
  const [finalTransform] = context.finalTransform
  const [isMoving] = context.isMoving;

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
  const ctx = canvas.getContext('2d');

  const fullImageMultiplier = () => Math.min(
    canvasSize()[0] / imageSize()[0],
    canvasSize()[1] / imageSize()[1]
  ) * 2 * context.pixelRatio;

  const fullImageCanvas = <canvas
    width={imageSize()[0] * fullImageMultiplier()}
    height={imageSize()[1] * fullImageMultiplier()}
  /> as HTMLCanvasElement;

  let brushPainter = new BrushPainter({
    imageCanvas: imageCanvas(),
    targetCanvas: canvas
  });

  let fullImageBrushPainter: BrushPainter;

  createEffect(on(canvasSize, () => {
    brushPainter = new BrushPainter({
      imageCanvas: imageCanvas(),
      targetCanvas: canvas
    });
    redraw();
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
    if(isMoving()) {
      const transform = finalTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(transform.translation[0] + canvas.width / 2, transform.translation[1] + canvas.height / 2);
      ctx.rotate(transform.rotation);
      ctx.scale(transform.scale, transform.scale);

      const [w, h] = imageSize();
      ctx.drawImage(fullImageCanvas, -(w / 2), -(h / 2), w, h);

      ctx.restore();
    } else {
      redraw();
      redrawFull();
    }
  });

  function redraw() {
    brushPainter.clear();
    brushPainter.saveLastLine();
    processedLines().forEach((line) => brushPainter.drawLine(line));
  }

  function processLineForFullImage(line: BrushDrawnLine) {
    return {
      ...line,
      size: line.size * fullImageMultiplier(),
      points: line.points.map(point => [
        (point[0] + imageSize()[0] / 2) * fullImageMultiplier(),
        (point[1] + imageSize()[1] / 2) * fullImageMultiplier()
      ] as [number, number])
    }
  }

  function redrawFull() {
    fullImageBrushPainter.clear();
    fullImageBrushPainter.saveLastLine();

    lines().forEach((line) => fullImageBrushPainter.drawLine(
      processLineForFullImage(line))
    );
  }

  createEffect(on(imageSize, () => {
    if(!imageSize()?.[0]) return;
    fullImageBrushPainter = new BrushPainter({
      imageCanvas: imageCanvas(),
      targetCanvas: fullImageCanvas,
      blurAmount: BrushPainter.defaultBlurAmount * fullImageMultiplier(),
      drawImageCanvas(ctx) {
        const transform = finalTransform();
        ctx.save();
        ctx.translate(
          ctx.canvas.width / 2 + transform.translation[0] / transform.scale * fullImageMultiplier(),
          ctx.canvas.height / 2 - transform.translation[1] / transform.scale * fullImageMultiplier()
        );
        ctx.rotate(-transform.rotation);
        ctx.scale(1 / transform.scale * fullImageMultiplier(), 1 / transform.scale * fullImageMultiplier());
        ctx.drawImage(imageCanvas(), -imageCanvas().width / 2, -imageCanvas().height / 2);
        ctx.restore();
      }
    });

    redraw();
    redrawFull();
  }));

  createEffect(() => {
    if(isAdjusting() || currentTab() === 'crop') {
      onCleanup(() => {
        redraw();
        redrawFull();
      })
    }
  })

  context.redrawBrushes = () => {
    redraw();
    redrawFull();
  };
  onCleanup(() => {
    context.redrawBrushes = () => {}
  });


  onMount(() => {
    let initialPosition: [number, number];
    let points: [number, number][] = [];

    let shouldReplaceLastPoint = false;

    function saveLastLine() {
      const prevLines = [...lines()];
      const newLines = [...lines(), lastLine()];
      setLines(newLines);
      fullImageBrushPainter.updateBlurredImage()
      fullImageBrushPainter.drawLine(processLineForFullImage(lastLine()));
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
      brushPainter.updateBlurredImage();
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
        setTimeout(async() => {
          if(lastLine().brush === 'arrow') {
            await brushPainter.animateArrowBrush(processLine(lastLine()));
          }
          saveLastLine();
        }, REPLACE_LAST_POINT_TIMEOUT_MS);
      }
    });
  });

  return <>
    {canvas}
  </>;
}
