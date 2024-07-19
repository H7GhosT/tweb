import {createEffect, on, onMount, useContext} from 'solid-js'
import createElementFromMarkup from '../../../helpers/createElementFromMarkup'
import MediaEditorContext from '../context'
import {hexaToHsla} from '../../../helpers/color'
import {ResizableContainer, ResizableLayerProps, TextLayerInfo} from './resizableLayers'


export default function TextLayerContent(props: ResizableLayerProps) {
  const context = useContext(MediaEditorContext)
  const [, setSelectedResizableLayer] = context.selectedResizableLayer
  const [currentTextLayerInfo, setCurrentTextLayerInfo] = context.currentTextLayerInfo

  const [layer, setLayer] = props.layerSignal

  if(!layer().info) return

  const onFocus = () => {
    setSelectedResizableLayer(layer().id)
    setCurrentTextLayerInfo({
      color: layer().info.color,
      alignment: layer().info.alignment,
      style: layer().info.style,
      size: layer().info.size,
      font: layer().info.font
    })
  }

  const fontInfo = () => fontInfoMap[layer().info.font]

  function updateBackground() {
    container.querySelector('.media-editor__text-layer-background')?.remove()
    if(layer().info.style === 'background') return updateBackgroundStyle(container, contentEditable, layer().info)
    if(layer().info.style === 'outline') return updateOutlineStyle(container, contentEditable, layer().info)
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

  createEffect(on(currentTextLayerInfo, () => {
    setLayer(prev => ({
      ...prev,
      info: currentTextLayerInfo()
    }))
  }))


  let container: HTMLDivElement
  let contentEditable: HTMLDivElement

  const color = () => {
    if(layer().info.style === 'normal') return layer().info.color
    return hexaToHsla(layer().info.color).l < 80 ? '#ffffff' : '#000000'
  }

  return (
    <ResizableContainer
      layerSignal={props.layerSignal}
      onDoubleClick={() => selectAll()}
    >
      <div
        ref={container}
        class="media-editor__text-layer"
        classList={{
          'media-editor__text-layer--with-bg': layer().info.style === 'background'
        }}
        style={{
          'color': color(),
          'font-size': layer().info.size + 'px',
          'font-family': fontInfo().fontFamily,
          'font-weight': fontInfo().fontWeight,
          '--align-items': alignMap[layer().info.alignment]
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
