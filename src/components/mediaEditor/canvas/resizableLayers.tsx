import {createEffect, createMemo, createSignal, For, on, onMount, ParentProps, Show, Signal, useContext} from 'solid-js';

import SwipeHandler, {getEvent} from '../../swipeHandler';

import {withCurrentOwner} from '../utils';
import MediaEditorContext from '../context';
import {ResizableLayer} from '../types';

import TextLayerContent from './textLayerContent';
import StickerLayerContent from './stickerLayerContent';
import useNormalizePoint from './useNormalizePoint';
import useProcessPoint from './useProcessPoint';

type ResizableContainerProps = {
  layerSignal: Signal<ResizableLayer>;
  onDoubleClick?: () => void;
};

export default function ResizableLayers() {
  const context = useContext(MediaEditorContext);
  const [layers, setLayers] = context.resizableLayers;
  const [currentTab] = context.currentTab;
  const isTextTab = () => currentTab() === 'text';
  const [currentTextLayerInfo] = context.currentTextLayerInfo;
  const [selectedResizableLayer, setSelectedResizableLayer] = context.selectedResizableLayer;
  const [isAdjusting] = context.isAdjusting;
  const [finalTransform] = context.finalTransform

  createEffect(
    on(selectedResizableLayer, () => {
      setLayers((prev) => {
        const res = [...(prev || [])];
        const idx = res.findIndex((layer) => layer[0]().id === selectedResizableLayer());
        if(idx > -1) {
          const signal = res[idx];
          res.splice(idx, 1);
          res.push(signal);
          return res;
        }
        return prev;
      });
    })
  );

  createEffect(() => {
    if(!isTextTab()) setSelectedResizableLayer();
  });

  let container: HTMLDivElement;

  const normalizePoint = useNormalizePoint()

  function addLayer(e: MouseEvent) {
    if(e.target !== container) return;
    if(!isTextTab()) return;

    const bcr = container.getBoundingClientRect();
    const transform = finalTransform()

    const newResizableLayer = {
      id: context.resizableLayersSeed++,
      position: normalizePoint([e.clientX - bcr.left, e.clientY - bcr.top]),
      rotation: -transform.rotation,
      scale: 1 / transform.scale,
      type: 'text',
      textInfo: currentTextLayerInfo()
    } as ResizableLayer;
    setLayers((prev) => [...prev, createSignal<ResizableLayer>({...newResizableLayer})]);

    let position = -1;
    let deletedLayer: ResizableLayer;
    context.pushToHistory({
      undo() {
        setLayers((prev) => {
          prev = [...prev];
          position = prev.findIndex((layer) => layer[0]().id === newResizableLayer.id);
          if(position > -1) deletedLayer = prev.splice(position, 1)[0]?.[0]();
          return prev;
        });
      },
      redo() {
        setLayers((prev) => {
          prev = [...prev];
          if(position > -1) prev.splice(position, 0, createSignal({...deletedLayer}));
          return prev;
        });
      }
    });
  }

  return (
    <div
      class="media-editor__resizable-layers"
      classList={{
        'media-editor__resizable-layers--active': isTextTab()
      }}
    >
      <div
        ref={container}
        class="media-editor__resizable-layers-inner"
        onClick={withCurrentOwner(addLayer)}
        style={{
          'opacity': isAdjusting() ? 0 : 1
        }}
      >
        <For each={layers()}>
          {(layerSignal) => (
            <>
              <Show when={layerSignal[0]().type === 'text'}>
                <TextLayerContent layerSignal={layerSignal} />
              </Show>
              <Show when={layerSignal[0]().type === 'sticker'}>
                <StickerLayerContent layerSignal={layerSignal} />
              </Show>
            </>
          )}
        </For>
      </div>
    </div>
  );
}

export function ResizableContainer(props: ParentProps<ResizableContainerProps>) {
  const context = useContext(MediaEditorContext);
  const [rotation] = context.rotation
  const [selectedResizableLayer, setSelectedResizableLayer] = context.selectedResizableLayer;
  const [finalTransform] = context.finalTransform

  const [layer, setLayer] = props.layerSignal;

  const [diff, setDiff] = createSignal([0, 0]);

  const normalizePoint = useNormalizePoint()

  let container: HTMLDivElement;
  let leftTopEl: HTMLDivElement;
  let rightTopEl: HTMLDivElement;
  let leftBottomEl: HTMLDivElement;
  let rightBottomEl: HTMLDivElement;

  onMount(() => {
    const multipliers = [
      {el: leftTopEl, x: -1, y: -1},
      {el: rightTopEl, x: 1, y: -1},
      {el: leftBottomEl, x: -1, y: 1},
      {el: rightBottomEl, x: 1, y: 1}
    ];

    multipliers.forEach(({el, x, y}) => {
      new SwipeHandler({
        element: el,
        onStart() {
          el.classList.add('media-editor__resizable-container-circle--anti-flicker');
        },
        onSwipe(_, __, _e) {
          const e = getEvent(_e);

          const initialVector = [(container.clientWidth / 2) * x * finalTransform().scale, (container.clientHeight / 2) * y * finalTransform().scale];
          const bcr = container.getBoundingClientRect();
          const resizedVector = [bcr.left + bcr.width / 2 - e.clientX, bcr.top + bcr.height / 2 - e.clientY];

          const rotationFromHorizon =
            Math.atan2(resizedVector[1], resizedVector[0]) - Math.atan2(initialVector[1], initialVector[0]) + Math.PI;
          const scale = Math.hypot(resizedVector[0], resizedVector[1]) / Math.hypot(initialVector[0], initialVector[1]);

          setLayer((prev) => ({...prev, rotation: rotationFromHorizon - rotation(), scale}));
        },
        onReset() {
          el.classList.remove('media-editor__resizable-container-circle--anti-flicker');
        }
      });
    });

    let swipeStarted = false;

    new SwipeHandler({
      element: container,
      onSwipe(xDiff, yDiff) {
        if(!swipeStarted) {
          // onStart messes up the typing
          swipeStarted = true;
          setSelectedResizableLayer(layer().id);
        }

        setDiff([xDiff, yDiff]);
      },
      onReset() {
        setLayer((prev) => ({
          ...prev,
          position: normalizePoint([processedLayer().position[0] + diff()[0], processedLayer().position[1] + diff()[1]])
        }));
        setDiff([0, 0]);
        swipeStarted = false;
      }
    });
  });

  const circleOffset = '-4px';

  const processPoint = useProcessPoint(false)

  const processedLayer = createMemo(() => ({
    position: processPoint(layer().position),
    rotation: layer().rotation + rotation(),
    scale: finalTransform().scale * layer().scale
  }));

  return (
    <div
      class="media-editor__resizable-container"
      classList={{
        'media-editor__resizable-container--active': layer().id === selectedResizableLayer()
      }}
      style={{
        'left': processedLayer().position[0] + diff()[0] + 'px',
        'top': processedLayer().position[1] + diff()[1] + 'px',
        '--rotation': (processedLayer().rotation / Math.PI) * 180 + 'deg',
        '--scale': processedLayer().scale
      }}
      ref={container}
    >
      {props.children}
      <div
        class="media-editor__resizable-container-border media-editor__resizable-container-border--vertical"
        style={{left: 0}}
      />
      <div
        class="media-editor__resizable-container-border media-editor__resizable-container-border--vertical"
        style={{right: 0}}
      />
      <div
        class="media-editor__resizable-container-border media-editor__resizable-container-border--horizontal"
        style={{top: 0}}
      />
      <div
        class="media-editor__resizable-container-border media-editor__resizable-container-border--horizontal"
        style={{bottom: 0}}
      />
      <div
        ref={leftTopEl}
        class="media-editor__resizable-container-circle"
        style={{left: circleOffset, top: circleOffset}}
      />
      <div
        ref={rightTopEl}
        class="media-editor__resizable-container-circle"
        style={{right: circleOffset, top: circleOffset}}
      />
      <div
        ref={leftBottomEl}
        class="media-editor__resizable-container-circle"
        style={{left: circleOffset, bottom: circleOffset}}
      />
      <div
        ref={rightBottomEl}
        class="media-editor__resizable-container-circle"
        style={{right: circleOffset, bottom: circleOffset}}
      />
    </div>
  );
}
