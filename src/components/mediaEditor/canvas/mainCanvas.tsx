import {onMount, Show, useContext} from 'solid-js';

import MediaEditorContext from '../context';

import CropHandles from './cropHandles';
import RotationWheel from './rotationWheel';
import ResizableLayers from './resizableLayers';
import BrushCanvas from './brushCanvas';
import ImageCanvas from './imageCanvas';

export default function MainCanvas() {
  let container: HTMLDivElement;
  const context = useContext(MediaEditorContext);
  const [canvasSize, setCanvasSize] = context.canvasSize;

  onMount(() => {
    const bcr = container.getBoundingClientRect();
    setCanvasSize([bcr.width, bcr.height]);
  });

  return (
    <div ref={container} class="media-editor__main-canvas">
      <Show when={canvasSize()}>
        <ImageCanvas />
        <BrushCanvas />
        <ResizableLayers />
        <CropHandles />
        <RotationWheel />
      </Show>
    </div>
  );
}
