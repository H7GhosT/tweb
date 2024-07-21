import {createEffect, createSignal, For, on, onMount, ParentProps, Show, Signal, useContext} from 'solid-js'

import SwipeHandler, {getEvent} from '../../swipeHandler'
import {Document} from '../../../layer'

import {withCurrentOwner} from '../utils'
import MediaEditorContext from '../context'

import TextLayerContent from './textLayerContent'
import StickerLayerContent from './stickerLayerContent'

export type ResizableLayer = {
  id: number
  type: 'text' | 'sticker'
  position: [number, number]
  rotation: number
  scale: number

  sticker?: Document.document

  textInfo?: TextLayerInfo
}

export type TextRenderingInfo = {
  width: number
  height: number

  path?: (number | string)[]
  lines: TextRenderingInfoLine[]
}

export type TextRenderingInfoLine = {
  left: number
  right: number
  height: number
  content: string
}

export type TextLayerInfo = {
  color: string
  alignment: string
  style: string
  size: number
  font: string
}

export type ResizableLayerProps = {
  layerSignal: Signal<ResizableLayer>
}

type ResizableContainerProps = {
  layerSignal: Signal<ResizableLayer>
  onDoubleClick?: () => void
}

export default function ResizableLayers() {
  const context = useContext(MediaEditorContext)
  const [layers, setLayers] = context.resizableLayers
  const [currentTab] = context.currentTab
  const isTextTab = () => currentTab() === 'text'
  const [currentTextLayerInfo] = context.currentTextLayerInfo
  const [selectedResizableLayer, setSelectedResizableLayer] = context.selectedResizableLayer


  createEffect(on(selectedResizableLayer, () => {
    setLayers(prev => {
      const res = [...(prev || [])]
      const idx = res.findIndex(layer => layer[0]().id === selectedResizableLayer())
      if(idx > -1) {
        const signal = res[idx]
        res.splice(idx, 1)
        res.push(signal)
        return res
      }
      return prev
    })
  }))

  createEffect(() => {
    if(!isTextTab()) setSelectedResizableLayer()
  })

  let container: HTMLDivElement

  function addLayer(e: MouseEvent) {
    if(e.target !== container) return
    if(!isTextTab()) return

    const bcr = container.getBoundingClientRect()

    setLayers(prev => [
      ...prev,
      createSignal<ResizableLayer>({
        id: context.resizableLayersSeed++,
        position: [e.clientX - bcr.left, e.clientY - bcr.top],
        rotation: 0,
        scale: 1,
        type: 'text',
        textInfo: currentTextLayerInfo()
      })
    ])
  }

  return (
    <div
      ref={container}
      class="media-editor__resizable-layers"
      classList={{
        'media-editor__resizable-layers--active': isTextTab()
      }}
      onClick={withCurrentOwner(addLayer)}
    >
      <For each={layers()}>
        {layerSignal => (
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
  )
}

export function ResizableContainer(props: ParentProps<ResizableContainerProps>) {
  const context = useContext(MediaEditorContext)
  const [selectedResizableLayer, setSelectedResizableLayer] = context.selectedResizableLayer

  const [layer, setLayer] = props.layerSignal

  const [diff, setDiff] = createSignal([0, 0])

  let container: HTMLDivElement
  let leftTopEl: HTMLDivElement
  let rightTopEl: HTMLDivElement
  let leftBottomEl: HTMLDivElement
  let rightBottomEl: HTMLDivElement

  const circleOffset = '-5px'


  onMount(() => {
    const multipliers = [
      {el: leftTopEl, x: -1, y: -1},
      {el: rightTopEl, x: 1, y: -1},
      {el: leftBottomEl, x: -1, y: 1},
      {el: rightBottomEl, x: 1, y: 1}
    ]

    multipliers.forEach(({el, x, y}) => {
      new SwipeHandler({
        element: el,
        onStart() {
          el.classList.add('media-editor__resizable-container-circle--anti-flicker')
        },
        onSwipe(_, __, _e) {
          const e = getEvent(_e)

          const initialVector = [
            container.clientWidth / 2 * x,
            container.clientHeight / 2 * y
          ]
          const bcr = container.getBoundingClientRect()
          const resizedVector = [
            bcr.left + bcr.width / 2 - e.clientX,
            bcr.top + bcr.height / 2 - e.clientY
          ]

          const rotation = Math.atan2(resizedVector[1], resizedVector[0]) - Math.atan2(initialVector[1], initialVector[0]) + Math.PI
          const scale = Math.hypot(resizedVector[0], resizedVector[1]) / Math.hypot(initialVector[0], initialVector[1])

          setLayer(prev => ({...prev, rotation}))
          setLayer(prev => ({...prev, scale}))
        },
        onReset() {
          el.classList.remove('media-editor__resizable-container-circle--anti-flicker')
        }
      })
    })

    let swipeStarted = false

    new SwipeHandler({
      element: container,
      onSwipe(xDiff, yDiff) {
        if(!swipeStarted) { // onStart messes up the typing
          swipeStarted = true
          setSelectedResizableLayer(layer().id)
        }

        setDiff([xDiff, yDiff])
      },
      onReset() {
        setLayer(prev => ({
          ...prev,
          position: [
            layer().position[0] + diff()[0],
            layer().position[1] + diff()[1]
          ]
        }))
        setDiff([0, 0])
        swipeStarted = false
      }
    })
  })

  return (
    <div
      class="media-editor__resizable-container"
      classList={{
        'media-editor__resizable-container--active': layer().id === selectedResizableLayer()
      }}
      style={{
        'left': layer().position[0] + diff()[0] + 'px',
        'top': layer().position[1] + diff()[1] + 'px',
        '--rotation': layer().rotation / Math.PI * 180 + 'deg',
        '--scale': layer().scale
      }}
      ref={container}
    >
      {props.children}
      <div ref={leftTopEl} class="media-editor__resizable-container-circle" style={{left: circleOffset, top: circleOffset}} />
      <div ref={rightTopEl} class="media-editor__resizable-container-circle" style={{right: circleOffset, top: circleOffset}} />
      <div ref={leftBottomEl} class="media-editor__resizable-container-circle" style={{left: circleOffset, bottom: circleOffset}} />
      <div ref={rightBottomEl} class="media-editor__resizable-container-circle" style={{right: circleOffset, bottom: circleOffset}} />
    </div>
  )
}
