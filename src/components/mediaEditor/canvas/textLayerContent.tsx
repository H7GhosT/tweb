import {createEffect, on, onMount, useContext} from 'solid-js'

import createElementFromMarkup from '../../../helpers/createElementFromMarkup'
import {hexaToHsla} from '../../../helpers/color'

import MediaEditorContext from '../context'

import {ResizableContainer, ResizableLayerProps, TextLayerInfo, TextRenderingInfoLine} from './resizableLayers'


export default function TextLayerContent(props: ResizableLayerProps) {
  const context = useContext(MediaEditorContext)
  const [selectedResizableLayer, setSelectedResizableLayer] = context.selectedResizableLayer
  const [currentTextLayerInfo, setCurrentTextLayerInfo] = context.currentTextLayerInfo
  const [, setTextLayersInfo] = context.textLayersInfo

  const [layer, setLayer] = props.layerSignal

  if(!layer().textInfo) return

  const onFocus = () => {
    setSelectedResizableLayer(layer().id)
    setCurrentTextLayerInfo({
      color: layer().textInfo.color,
      alignment: layer().textInfo.alignment,
      style: layer().textInfo.style,
      size: layer().textInfo.size,
      font: layer().textInfo.font
    })
  }

  const fontInfo = () => fontInfoMap[layer().textInfo.font]

  function updateBackground() {
    container.querySelector('.media-editor__text-layer-background')?.remove()
    const lines = getLinesRenderingInfo(contentEditable, layer().textInfo.alignment)
    const path = createTextBackgroundPath(lines)

    if(layer().textInfo.style === 'background') updateBackgroundStyle(container, path.join(' '), layer().textInfo)
    if(layer().textInfo.style === 'outline') updateOutlineStyle(container, contentEditable, layer().textInfo)

    setTextLayersInfo(prev => ({
      ...prev,
      [layer().id]: {
        width: container.clientWidth,
        height: container.clientHeight,
        path,
        lines
      }
    }))
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
    if(selectedResizableLayer() !== layer().id) return
    setLayer(prev => ({
      ...prev,
      textInfo: currentTextLayerInfo()
    }))
  }))


  let container: HTMLDivElement
  let contentEditable: HTMLDivElement

  const color = () => {
    if(layer().textInfo.style === 'normal') return layer().textInfo.color
    return getContrastColor(layer().textInfo.color)
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
          'media-editor__text-layer--with-bg': layer().textInfo.style === 'background'
        }}
        style={{
          'color': color(),
          'font-size': layer().textInfo.size + 'px',
          'font-family': fontInfo().fontFamily,
          'font-weight': fontInfo().fontWeight,
          '--align-items': flexAlignMap[layer().textInfo.alignment]
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


function getLinesRenderingInfo(linesContainer: HTMLDivElement, alignment: string): TextRenderingInfoLine[] {
  return Array.from(linesContainer.children).map((_child) => {
    const child = _child as HTMLElement
    let offset = 0
    if(alignment === 'left') {
      offset = 0
    } else if(alignment === 'center') {
      offset = (linesContainer.clientWidth - child.clientWidth) / 2
    } else {
      offset = linesContainer.clientWidth - child.clientWidth
    }
    return {
      left: offset,
      right: offset + child.clientWidth,
      content: child.innerText,
      height: child.clientHeight
    }
  })
}

function createTextBackgroundPath(lines: TextRenderingInfoLine[]) {
  const first = lines[0]

  const rounding = first.height * 0.3

  const arcParams = (r: number, s: number = 1) => [r, r, 0, 0, s]

  const path = []
  path.push('M', first.left, rounding)

  path.push('A', ...arcParams(rounding), first.left + rounding, 0)
  path.push('L', first.right - rounding, 0)
  path.push('A', ...arcParams(rounding), first.right, rounding)

  let prevPosition = first
  let prevY = first.height

  for(let i = 1; i < lines.length; i++) {
    const position = lines[i]

    const diffSign = position.right > prevPosition.right ? 1 : -1
    const diff = Math.min(Math.abs((position.right - prevPosition.right) / 2), rounding) * diffSign
    const currentRounding = Math.abs(diff)

    path.push('L', prevPosition.right, prevY - currentRounding)
    path.push('A', ...arcParams(currentRounding, diffSign === 1 ? 0 : 1), prevPosition.right + diff, prevY)
    path.push('L', position.right - diff, prevY)
    path.push('A', ...arcParams(currentRounding, diffSign === 1 ? 1 : 0), position.right, prevY + currentRounding)

    prevY += position.height
    prevPosition = position
  }

  path.push('L', prevPosition.right, prevY - rounding)
  path.push('A', ...arcParams(rounding), prevPosition.right - rounding, prevY)
  path.push('L', prevPosition.left + rounding, prevY)
  path.push('A', ...arcParams(rounding), prevPosition.left, prevY - rounding)

  const last = lines[lines.length - 1]
  prevY -= last.height
  for(let i = lines.length - 2; i >= 0; i--) {
    const position = lines[i]

    const diffSign = position.left > prevPosition.left ? 1 : -1
    const diff = Math.min(Math.abs((position.left - prevPosition.left) / 2), rounding) * diffSign
    const currentRounding = Math.abs(diff)

    path.push('L', prevPosition.left, prevY + currentRounding)
    path.push('A', ...arcParams(currentRounding, diffSign !== 1 ? 0 : 1), prevPosition.left + diff, prevY)
    path.push('L', position.left - diff, prevY)
    path.push('A', ...arcParams(currentRounding, diffSign !== 1 ? 1 : 0), position.left, prevY - currentRounding)

    prevY -= position.height
    prevPosition = position
  }

  return path
}


function updateBackgroundStyle(container: HTMLDivElement, path: string, info: TextLayerInfo) {
  const svg = createElementFromMarkup(`
    <svg width="${container.clientWidth}" height="${container.clientHeight}" viewBox="0 0 ${container.clientWidth} ${container.clientHeight}">
      <path d="${path}" fill="${info.color}" />
    </svg>
  `)
  svg.classList.add('media-editor__text-layer-background')
  container.prepend(svg)

  return path
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

export function getContrastColor(color: string) {
  return hexaToHsla(color).l < 80 ? '#ffffff' : '#000000'
}


const flexAlignMap: Record<string, string> = {
  left: 'start',
  center: 'center',
  right: 'end'
}

type FontInfo = {
  fontFamily: string
  fontWeight: number
  baseline: number
}

export const fontInfoMap: Record<string, FontInfo> = {
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