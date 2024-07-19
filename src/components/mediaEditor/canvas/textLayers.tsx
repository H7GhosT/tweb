import {createEffect, createSignal, For, Match, on, onCleanup, onMount, ParentProps, Signal, Switch, useContext} from 'solid-js'
import createElementFromMarkup from '../../../helpers/createElementFromMarkup'
import {withCurrentOwner} from '../utils'
import MediaEditorContext from '../context'
import {hexaToHsla} from '../../../helpers/color'
import SwipeHandler, {getEvent} from '../../swipeHandler'

let idSeed = 0

export default function TextLayers() {
  const [layers, setLayers] = createSignal<Signal<TextLayerInfo>[]>([])
  const context = useContext(MediaEditorContext)
  const [currentLayerInfo, setCurrentLayerInfo] = context.currentTextLayerInfo
  const [selectedTextLayer] = context.selectedTextLayer


  createEffect(on(currentLayerInfo, () => {
    const layerSignal = layers().find(layer => layer[0]().id === selectedTextLayer())
    if(!layerSignal) return

    layerSignal[1](prev => ({
      ...prev,
      ...currentLayerInfo()
    }))
  }))

  createEffect(on(selectedTextLayer, () => {
    setLayers(prev => {
      const res = [...(prev || [])]
      const idx = res.findIndex(layer => layer[0]().id === selectedTextLayer())
      if(idx > -1) {
        const signal = res[idx]
        res.splice(idx, 1)
        res.push(signal)
        return res
      }
      return prev
    })
  }))

  let container: HTMLDivElement

  function addLayer(e: MouseEvent) {
    if(e.target !== container) return

    const bcr = container.getBoundingClientRect()

    setLayers(prev => [
      ...prev,
      createSignal({
        id: idSeed++,
        position: [e.clientX - bcr.left, e.clientY - bcr.top],
        rotation: 0,
        scale: 1,
        ...currentLayerInfo()
      })
    ])
  }

  return (
    <div
      ref={container}
      class="media-editor__text-layers-container"
      onClick={withCurrentOwner(addLayer)}
    >
      <For each={layers()}>
        {layerSignal => <TextLayer layerSignal={layerSignal} />}
      </For>
    </div>
  )
}

export type TextLayerInfo = {
  id: number
  position: [number, number]
  rotation: number
  scale: number
  color: string
  alignment: string
  style: string
  size: number
  font: string
}

type TextLayerProps = {
  layerSignal: Signal<TextLayerInfo>
}


function TextLayer(props: TextLayerProps) {
  const context = useContext(MediaEditorContext)
  const [selectedTextLayer, setSelectedTextLayer] = context.selectedTextLayer
  const [, setCurrentLayerInfo] = context.currentTextLayerInfo

  const [layerInfo, setLayerInfo] = props.layerSignal

  const onFocus = () => {
    setSelectedTextLayer(layerInfo().id)
    setCurrentLayerInfo({
      color: layerInfo().color,
      alignment: layerInfo().alignment,
      style: layerInfo().style,
      size: layerInfo().size,
      font: layerInfo().font
    })
  }

  const fontInfo = () => fontInfoMap[layerInfo().font]

  function updateBackground() {
    container.querySelector('.media-editor__text-layer-background')?.remove()
    if(layerInfo().style === 'background') return updateBackgroundStyle(container, contentEditable, layerInfo())
    if(layerInfo().style === 'outline') return updateOutlineStyle(container, contentEditable, layerInfo())
  }

  function selectAll() {
    const range = document.createRange();
    range.selectNodeContents(contentEditable);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  onMount(() => {
    selectAll()
  })

  createEffect(() => {
    updateBackground()
  })

  let container: HTMLDivElement
  let contentEditable: HTMLDivElement

  const color = () => {
    if(layerInfo().style === 'normal') return layerInfo().color
    return hexaToHsla(layerInfo().color).l < 80 ? '#ffffff' : '#000000'
  }

  return (
    <ResizableContainer
      active={layerInfo().id === selectedTextLayer()}
      position={layerInfo().position}
      scale={layerInfo().scale}
      rotation={layerInfo().rotation}
      onPositionChange={(position) => setLayerInfo(prev => ({...prev, position}))}
      onRotationChange={(rotation) => setLayerInfo(prev => ({...prev, rotation}))}
      onScaleChange={(scale) => setLayerInfo(prev => ({...prev, scale}))}
      onDoubleClick={() => selectAll()}
      onMoveStart={() => setSelectedTextLayer(layerInfo().id)}
    >
      <div
        ref={container}
        class="media-editor__text-layer"
        classList={{
          'media-editor__text-layer--with-bg': layerInfo().style === 'background'
        }}
        style={{
          // 'left': layerInfo().position[0] + 'px',
          // 'top': layerInfo().position[1] + 'px',
          'color': color(),
          'font-size': layerInfo().size + 'px',
          'font-family': fontInfo().fontFamily,
          'font-weight': fontInfo().fontWeight,
          '--align-items': alignMap[layerInfo().alignment]
        }}
      >
        <div
          ref={contentEditable}
          class="media-editor__text-layer-layout"
          contenteditable
          onInput={() => updateBackground()}
          onFocus={onFocus}
        >
          <div>
            Type something...
          </div>
        </div>
      </div>
    </ResizableContainer>
  )
}


type ResizableContainerProps = {
  position: [number, number]
  scale: number
  rotation: number
  onPositionChange: (value: [number, number]) => void
  onRotationChange: (value: number) => void
  onScaleChange: (value: number) => void
  onDoubleClick?: () => void
  onMoveStart: () => void
  active: boolean
}

function ResizableContainer(props: ParentProps<ResizableContainerProps>) {
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

          props.onRotationChange(rotation)
          props.onScaleChange(scale)
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
          props.onMoveStart()
        }

        setDiff([xDiff, yDiff])
      },
      onReset() {
        props.onPositionChange([
          props.position[0] + diff()[0],
          props.position[1] + diff()[1]
        ])
        setDiff([0, 0])
        swipeStarted = false
      }
    })
  })

  return (
    <div
      class="media-editor__resizable-container"
      classList={{
        'media-editor__resizable-container--active': props.active
      }}
      style={{
        'left': props.position[0] + diff()[0] + 'px',
        'top': props.position[1] + diff()[1] + 'px',
        '--rotation': props.rotation / Math.PI * 180 + 'deg',
        '--scale': props.scale
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

type E = {
  clientX: number,
  clientY: number,
  target: EventTarget,
  button?: number,
  type?: string
};


function updateBackgroundStyle(container: HTMLDivElement, contentEditable: HTMLDivElement, info: TextLayerInfo) {
  const children = Array.from(contentEditable.children)

  const first = children[0] as HTMLDivElement

  const rounding = first.clientHeight * 0.3

  function getChildX(child: Element) {
    let offset = 0
    if(info.alignment === 'left') {
      offset = 0
    } else if(info.alignment === 'center') {
      offset = (container.clientWidth - child.clientWidth) / 2
    } else {
      offset = container.clientWidth - child.clientWidth
    }
    return [offset, offset + child.clientWidth]
  }

  const firstX = getChildX(first)

  const arcParams = (r: number, s: number = 1) => `${r} ${r} 0 0 ${s}`

  let path = `M ${firstX[0]} ${rounding} `
  path += `A ${arcParams(rounding)} ${firstX[0] + rounding} 0 `
  path += `L ${firstX[1] - rounding} 0 `
  path += `A ${arcParams(rounding)} ${firstX[1]} ${rounding} `

  let prevX = firstX
  let prevY = first.clientHeight

  for(let i = 1; i < children.length; i++) {
    const child = children[i]

    const x = getChildX(child)
    const diffSign = x[1] > prevX[1] ? 1 : -1
    const diff = Math.min(Math.abs((x[1] - prevX[1]) / 2), rounding) * diffSign
    const currentRounding = Math.abs(diff)

    path += `L ${prevX[1]} ${prevY - currentRounding}`
    path += `A ${arcParams(currentRounding, diffSign === 1 ? 0 : 1)} ${prevX[1] + diff} ${prevY}`
    path += `L ${x[1] - diff} ${prevY}`
    path += `A ${arcParams(currentRounding, diffSign === 1 ? 1 : 0)} ${x[1]} ${prevY + currentRounding}`

    prevY += child.clientHeight
    prevX = x
  }

  const last = children[children.length - 1]
  path += `L ${prevX[1]} ${prevY - rounding} `
  path += `A ${arcParams(rounding)} ${prevX[1] - rounding} ${prevY} `
  path += `L ${prevX[0] + rounding} ${prevY} `
  path += `A ${arcParams(rounding)} ${prevX[0]} ${prevY - rounding} `

  prevY -= last.clientHeight
  for(let i = children.length - 2; i >= 0; i--) {
    const child = children[i]

    const x = getChildX(child)
    const diffSign = x[0] > prevX[0] ? 1 : -1
    const diff = Math.min(Math.abs((x[0] - prevX[0]) / 2), rounding) * diffSign
    const currentRounding = Math.abs(diff)

    path += `L ${prevX[0]} ${prevY + currentRounding}`
    path += `A ${arcParams(currentRounding, diffSign !== 1 ? 0 : 1)} ${prevX[0] + diff} ${prevY}`
    path += `L ${x[0] - diff} ${prevY}`
    path += `A ${arcParams(currentRounding, diffSign !== 1 ? 1 : 0)} ${x[0]} ${prevY - currentRounding}`

    prevY -= child.clientHeight
    prevX = x
  }

  const svg = createElementFromMarkup(`
    <svg width="${container.clientWidth}" height="${container.clientHeight}" viewBox="0 0 ${container.clientWidth} ${container.clientHeight}">
      <path d="${path}" fill="${info.color}" />
    </svg>
  `)
  svg.classList.add('media-editor__text-layer-background')
  container.prepend(svg)

  return svg
}

function updateOutlineStyle(container: HTMLDivElement, contentEditable: HTMLDivElement, info: TextLayerInfo) {
  const fontInfo = fontInfoMap[info.font]
  function updateSvg(div: HTMLDivElement) {
    div.querySelector('.media-editor__text-layer-svg-outline')?.remove()
    const svg = createElementFromMarkup(`
      <div class="media-editor__text-layer-svg-outline">
        <svg width="${div.clientWidth}" height="${div.clientHeight}" viewBox="0 0 ${div.clientWidth} ${div.clientHeight}">
          <text
            x="${info.size * 0.2}"
            y="${(div.clientHeight * fontInfo.baseline)}"
            style="font-size:${info.size}px;stroke:${info.color};stroke-width:${div.clientHeight * 0.15}px;font-family:${fontInfo.fontFamily};font-weight:${fontInfo.fontWeight};">
            ${div.innerText}
          </text>
        </svg>
      </div>
    `)
    div.prepend(svg)
  }

  const bgDiv = document.createElement('div')
  bgDiv.classList.add('media-editor__text-layer-background', 'media-editor__text-layer-background--as-layout')
  bgDiv.innerHTML = contentEditable.innerHTML
  container.prepend(bgDiv)
  Array.from(bgDiv.children).forEach(line => {
    if(line instanceof HTMLDivElement) updateSvg(line)
  })
}


const alignMap: Record<string, string> = {
  left: 'start',
  center: 'center',
  right: 'end'
}

type FontInfo = {
  fontFamily: string
  fontWeight: number
  baseline: number
}

const fontInfoMap: Record<string, FontInfo> = {
  roboto: {
    fontFamily: '\'Roboto\'',
    fontWeight: 500,
    baseline: 0.75
  },
  times: {
    fontFamily: '\'Times New Roman\'',
    fontWeight: 600,
    baseline: 0.75
  },
  segoe: {
    fontFamily: '\'Segoe UI\'',
    fontWeight: 500,
    baseline: 0.78
  }
}
