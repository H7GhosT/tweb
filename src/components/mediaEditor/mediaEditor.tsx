import {createSignal, onCleanup, onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {NoneToVoidFunction} from '../../types';
import {doubleRaf} from '../../helpers/schedulers';

import MediaEditorTabs from './mediaEditorTabs';
import MediaEditorTopbar from './mediaEditorTopbar';
import {delay} from './utils';
import MediaEditorTabContent from './mediaEditorTabContent';


export function MediaEditor(props: {
  onClose: NoneToVoidFunction
}) {
  const [tab, setTab] = createSignal('equalizer')

  let overlay: HTMLDivElement;

  onMount(async() => {
    console.log('[Media editor] mounted');
    overlay.classList.add('media-editor-overlay-hidden')
    await doubleRaf()
    overlay.classList.remove('media-editor-overlay-hidden')
  })

  onCleanup(() => {
    console.log('[Media editor] cleanup');
  })

  async function handleClose() {
    overlay.classList.add('media-editor-overlay-hidden')
    await delay(200)
    props.onClose()
  }


  return (
    <div ref={overlay} class="media-editor-overlay night">
      <div class="media-editor-container">
        <div class="media-editor-image-container"></div>
        <div class="media-editor-toolbar">
          <MediaEditorTopbar onClose={handleClose} />
          <MediaEditorTabs tab={tab()} onTabChange={setTab} />
          <MediaEditorTabContent activeTab={tab()} tabs={{
            equalizer: <div>equalizer</div>,
            crop: <div>crop</div>,
            text: <div>text</div>,
            brush: <div>brush</div>,
            stickers: <div>stickers</div>
          }} />
        </div>
      </div>
    </div>
  )
}

export function openMediaEditor() {
  const element = document.createElement('div')
  document.body.append(element)
  console.log('[Media editor] appended');

  const dispose = render(() => <MediaEditor onClose={onClose} />, element)
  console.log('[Media editor] rendered');

  function onClose() {
    dispose()
  }
}
