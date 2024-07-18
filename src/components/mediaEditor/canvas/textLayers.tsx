import {createSignal, For, onMount, Signal, useContext} from 'solid-js'
import createElementFromMarkup from '../../../helpers/createElementFromMarkup'
import {withCurrentOwner} from '../utils'
import MediaEditorContext from '../context'
import {hexaToHsla} from '../../../helpers/color'

let idSeed = 0

export default function TextLayers() {
  const [layers, setLayers] = createSignal<Signal<TextLayerInfo>[]>([])
  const context = useContext(MediaEditorContext)
  const [currentLayerInfo, setCurrentLayerInfo] = context.currentTextLayerInfo

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
        {layer => <OutlinedTextLayer info={layer[0]()} />}
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

function OutlinedTextLayer(props: {info: TextLayerInfo}) {
  function updateSvg(div: HTMLDivElement) {
    const bcr = div.getBoundingClientRect()
    div.querySelector('.svg-outline')?.remove()
    const svg = createElementFromMarkup(`
      <div contenteditable="false" class="svg-outline">
        <svg width="${bcr.width}" height="${bcr.height}" viewBox="0 0 ${bcr.width} ${bcr.height}">
          <text
            x="${52 / 10}"
            y="${bcr.height * 0.75}"
            style="font-size:52px;stroke:${props.info.color};stroke-width:${bcr.height / 10}px;">
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

  return (
    <div
      ref={container}
      class="media-editor__text-layer media-editor__text-layer--outline"
      style={{
        left: props.info.position[0] + 'px',
        top: props.info.position[1] + 'px',
        color: hexaToHsla(props.info.color).l < 70 ? '#ffffff' : '#000000',
        ['font-size']: '52px'
      }}
      contenteditable
      onInput={() => updateContainer()}
    >
      <div>
        <span>
          Type something...
        </span>
      </div>
    </div>
  )
}
