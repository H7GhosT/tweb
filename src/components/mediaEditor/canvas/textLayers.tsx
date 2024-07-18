import {createEffect, createSignal, For, Match, on, onMount, Signal, Switch, useContext} from 'solid-js'
import createElementFromMarkup from '../../../helpers/createElementFromMarkup'
import {withCurrentOwner} from '../utils'
import MediaEditorContext from '../context'
import {hexaToHsla} from '../../../helpers/color'

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

  let container: HTMLDivElement

  function addLayer(e: MouseEvent) {
    if(e.target !== container) return

    const bcr = container.getBoundingClientRect()

    setLayers(prev => [
      ...prev,
      createSignal({
        id: idSeed++,
        position: [e.clientX - bcr.left, e.clientY - bcr.top],
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
        {layer => <TextLayerEntry info={layer[0]()} />}
      </For>
    </div>
  )
}

type TextLayerInfo = {
  id: number
  position: [number, number]
  // rotation: number
  // scale: number
  color: string
  alignment: string
  style: string
  size: number
  font: string
}

type TextLayerEntryProps = {
  info: TextLayerInfo
}

type TextLayerProps = TextLayerEntryProps & {
  onFocus: () => void
}

function TextLayerEntry(props: TextLayerEntryProps) {
  const context = useContext(MediaEditorContext)
  const [, setSelectedTextLayer] = context.selectedTextLayer
  const [, setCurrentLayerInfo] = context.currentTextLayerInfo

  const onFocus = () => {
    setSelectedTextLayer(props.info.id)
    setCurrentLayerInfo({
      color: props.info.color,
      alignment: props.info.alignment,
      style: props.info.style,
      size: props.info.size,
      font: props.info.font
    })
  }

  return (
    <>
      <Switch fallback={'nothing'}>
        <Match when={props.info.style === 'outline'}>
          <OutlinedTextLayer info={props.info} onFocus={onFocus} />
        </Match>
        <Match when={props.info.style === 'background'}>
          <BackgroundTextLayer info={props.info} onFocus={onFocus} />
        </Match>
      </Switch>
    </>
  )
}

function BackgroundTextLayer(props: TextLayerProps) {
  const fontInfo = () => fontInfoMap[props.info.font]


  function updateContainer() {
    container.querySelector('.media-editor__text-layer-svg-background')?.remove()
    const children = Array.from(contentEditable.children)


    const first = children[0] as HTMLDivElement

    const rounding = first.clientHeight * 0.3

    function getChildX(child: Element) {
      let offset = 0
      if(props.info.alignment === 'left') {
        offset = 0
      } else if(props.info.alignment === 'center') {
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
    const lastX = getChildX(last)
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
    // path += `L ${container.clientWidth} ${container.clientHeight}`
    // path += `L 0 ${container.clientHeight}`

    const svg = createElementFromMarkup(`
      <svg width="${container.clientWidth}" height="${container.clientHeight}" viewBox="0 0 ${container.clientWidth} ${container.clientHeight}">
        <path d="${path}" fill="${props.info.color}" />
      </svg>
    `)
    svg.classList.add('media-editor__text-layer-svg-background')
    container.prepend(svg)
  }

  onMount(() => {
    updateContainer()
    const range = document.createRange();
    range.selectNodeContents(contentEditable);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  })

  createEffect(() => {
    updateContainer()
  })

  let container: HTMLDivElement
  let contentEditable: HTMLDivElement

  return (
    <div
      ref={container}
      class="media-editor__text-layer media-editor__text-layer--with-bg"
      style={{
        'left': props.info.position[0] + 'px',
        'top': props.info.position[1] + 'px',
        'color': hexaToHsla(props.info.color).l < 70 ? '#ffffff' : '#000000',
        'font-size': props.info.size + 'px',
        'font-family': fontInfo().fontFamily,
        'font-weight': fontInfo().fontWeight,
        '--align-items': alignMap[props.info.alignment]
      }}
    >
      <div
        ref={contentEditable}
        class="media-editor__text-layer-layout"
        contenteditable
        onInput={() => updateContainer()}
        onFocus={props.onFocus}
      >
        <div>
          Type something...
        </div>
      </div>
    </div>
  )
}

function OutlinedTextLayer(props: TextLayerProps) {
  const fontInfo = () => fontInfoMap[props.info.font]

  function updateSvg(div: HTMLDivElement) {
    div.querySelector('.media-editor__text-layer-svg-outline')?.remove()
    const svg = createElementFromMarkup(`
      <div class="media-editor__text-layer-svg-outline">
        <svg width="${div.clientWidth}" height="${div.clientHeight}" viewBox="0 0 ${div.clientWidth} ${div.clientHeight}">
          <text
            x="${props.info.size * 0.2}"
            y="${div.clientHeight * fontInfo().baseline}"
            style="font-size:${props.info.size}px;stroke:${props.info.color};stroke-width:${div.clientHeight * 0.2}px;font-family:${fontInfo().fontFamily};font-weight:${fontInfo().fontWeight};">
            ${div.innerText}
          </text>
        </svg>
      </div>
    `)
    div.prepend(svg)
  }


  function updateContainer() {
    container.querySelector('.media-editor__text-layer-background')?.remove()
    const bgDiv = document.createElement('div')
    bgDiv.classList.add('media-editor__text-layer-background')
    const lines = contentEditable.innerText.split('\n')
    bgDiv.innerHTML = lines.map(line => `<div>${line}</div>`).join('')
    container.prepend(bgDiv)
    Array.from(bgDiv.children).forEach(line => {
      if(line instanceof HTMLDivElement) updateSvg(line)
    })
  }

  onMount(() => {
    updateContainer()
    const range = document.createRange();
    range.selectNodeContents(contentEditable);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  })

  createEffect(() => {
    updateContainer()
  })

  let container: HTMLDivElement
  let contentEditable: HTMLDivElement

  return (
    <div
      ref={container}
      class="media-editor__text-layer media-editor__text-layer--outline"
      style={{
        'left': props.info.position[0] + 'px',
        'top': props.info.position[1] + 'px',
        'color': hexaToHsla(props.info.color).l < 70 ? '#ffffff' : '#000000',
        'font-size': props.info.size + 'px',
        'font-family': fontInfo().fontFamily,
        'font-weight': fontInfo().fontWeight,
        '--align-items': alignMap[props.info.alignment]
      }}
    >
      <div
        ref={contentEditable}
        class="media-editor__text-layer-layout"
        contenteditable
        onInput={() => updateContainer()}
        onFocus={props.onFocus}
      >
        <div>
          Type something...
        </div>
      </div>
    </div>
  )
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
