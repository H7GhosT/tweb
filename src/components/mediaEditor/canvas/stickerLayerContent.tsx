import {onMount} from 'solid-js'

import createMiddleware from '../../../helpers/solid/createMiddleware'
import wrapSticker from '../../wrappers/sticker'

import {ResizableContainer, ResizableLayerProps} from './resizableLayers'

export default function StickerLayerContent(props: ResizableLayerProps) {
  let container: HTMLDivElement
  const [layer] = props.layerSignal

  onMount(() => {
    wrapSticker({
      div: container,
      doc: layer().sticker,
      group: 'none',
      width: 500,
      height: 500,
      middleware: createMiddleware().get(),
      textColor: 'white'
    })
  })

  return (
    <ResizableContainer
      layerSignal={props.layerSignal}
    >
      <div ref={container} class='media-editor__sticker-layer-content'></div>
    </ResizableContainer>
  )
}
