import {createSignal, onCleanup, onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {NoneToVoidFunction} from '../../types';
import {doubleRaf} from '../../helpers/schedulers';

import {delay} from './utils';
import MediaEditorTabs from './mediaEditorTabs';
import MediaEditorTopbar from './mediaEditorTopbar';
import MediaEditorTabContent from './mediaEditorTabContent';
import MediaEditorEqualizer from './mediaEditorEqualizer';


export function MediaEditor(props: {
  onClose: NoneToVoidFunction
}) {
  const [tab, setTab] = createSignal('equalizer')

  let overlay: HTMLDivElement;

  onMount(async() => {
    console.log('[Media editor] mounted');
    overlay.classList.add('media-editor__overlay--hidden')
    await doubleRaf()
    overlay.classList.remove('media-editor__overlay--hidden')
  })

  onCleanup(() => {
    console.log('[Media editor] cleanup');
  })

  async function handleClose() {
    overlay.classList.add('media-editor__overlay--hidden')
    await delay(200)
    props.onClose()
  }


  return (
    <div ref={overlay} class="media-editor__overlay night">
      <div class="media-editor__container">
        <div class="media-editor__image-container"></div>
        <div class="media-editor__toolbar">
          <MediaEditorTopbar onClose={handleClose} />
          <MediaEditorTabs tab={tab()} onTabChange={setTab} />
          <MediaEditorTabContent activeTab={tab()} tabs={{
            equalizer: <MediaEditorEqualizer />,
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
