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
      </Switch>
    </>
  )
}

function OutlinedTextLayer(props: TextLayerProps) {
  const fontInfo = () => fontInfoMap[props.info.font]

  function updateSvg(div: HTMLDivElement) {
    const bcr = div.getBoundingClientRect()
    div.querySelector('.media-editor__text-layer-svg-outline')?.remove()
    const svg = createElementFromMarkup(`
      <div contenteditable="false" class="media-editor__text-layer-svg-outline">
        <svg width="${bcr.width}" height="${bcr.height}" viewBox="0 0 ${bcr.width} ${bcr.height}">
          <text
            x="${props.info.size * 0.1}"
            y="${bcr.height * fontInfo().baseline}"
            style="font-size:${props.info.size}px;stroke:${props.info.color};stroke-width:${bcr.height / 10}px;font-family:${fontInfo().fontFamily};font-weight:${fontInfo().fontWeight};">
            ${div.innerText}
          </text>
        </svg>
      </div>
    `)
    div.prepend(svg)
  }


  let container: HTMLDivElement

  function updateContainer() {
    Array.from(container.children).forEach(line => {
      if(line instanceof HTMLDivElement) updateSvg(line)
    })
  }

  onMount(() => {
    updateContainer()
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  })

  createEffect(() => {
    updateContainer()
  })

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
        'align-items': alignMap[props.info.alignment]
      }}
      contenteditable
      onInput={() => updateContainer()}
      onFocus={props.onFocus}
    >
      <div>
        <span>
          Type something...
        </span>
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
