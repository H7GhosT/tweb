import {createEffect, onCleanup, onMount, Show, useContext} from 'solid-js';

import MediaEditorContext from '../context';

import CropHandles from './cropHandles';
import RotationWheel from './rotationWheel';
import ResizableLayers from './resizableLayers';
import BrushCanvas from './brushCanvas';
import ImageCanvas from './imageCanvas';
import useFinalTransform from './useFinalTransform';

export default function MainCanvas() {
  let container: HTMLDivElement;
  const context = useContext(MediaEditorContext);
  const [canvasSize, setCanvasSize] = context.canvasSize;

  useFinalTransform()

  onMount(() => {
    const listener = () => {
      const bcr = container.getBoundingClientRect();
      setCanvasSize([bcr.width, bcr.height]);
    }
    listener()
    window.addEventListener('resize', listener)
    onCleanup(() => {
      window.removeEventListener('resize', listener)
    })
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
