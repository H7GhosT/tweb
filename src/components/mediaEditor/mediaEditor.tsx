import {createSignal, onCleanup, onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {NoneToVoidFunction} from '../../types';
import {doubleRaf} from '../../helpers/schedulers';
import {AppManagers} from '../../lib/appManagers/managers';

import {delay} from './utils';
import {injectMediaEditorLangPack} from './langPack';
import {createAdjustmentsConfig} from './adjustments';
import MediaEditorTabs from './mediaEditorTabs';
import MediaEditorTopbar from './mediaEditorTopbar';
import MediaEditorTabContent from './mediaEditorTabContent';
import MediaEditorEqualizer from './mediaEditorEqualizer';
import MediaEditorCrop from './mediaEditorCrop';
import MediaEditorText from './mediaEditorText';
import MediaEditorBrush from './mediaEditorBrush';
import MediaEditorStickers from './mediaEditorStickers';
import MediaEditorContext from './context';
import MainCanvas from './canvas/mainCanvas';


type MediaEditorProps = {
  onClose: NoneToVoidFunction
  managers: AppManagers
}

export function MediaEditor(props: MediaEditorProps) {
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
    <MediaEditorContext.Provider value={{
      managers: props.managers,
      imageSrc: 'tmp/texture2.jpg',
      pixelRatio: window.devicePixelRatio,

      adjustments: createAdjustmentsConfig(),
      isCroping: createSignal(false),
      imageSize: createSignal([0, 0]),
      canvasResolution: createSignal(),
      currentImageRatio: createSignal(0),
      scale: createSignal(1),
      rotation: createSignal(0),
      translation: createSignal([0, 0]),
      flip: createSignal([1, 1])
    }}>
      <div ref={overlay} class="media-editor__overlay night">
        <div class="media-editor__container">
          <MainCanvas />
          <div class="media-editor__toolbar">
            <MediaEditorTopbar onClose={handleClose} />
            <MediaEditorTabs tab={tab()} onTabChange={setTab} />
            <MediaEditorTabContent activeTab={tab()} tabs={{
              equalizer: () => <MediaEditorEqualizer />,
              crop: () => <MediaEditorCrop />,
              text: () => <MediaEditorText />,
              brush: () => <MediaEditorBrush />,
              stickers: () => <MediaEditorStickers />
            }} />
          </div>
        </div>
      </div>
    </MediaEditorContext.Provider>
  )
}

export function openMediaEditor(props: MediaEditorProps) {
  injectMediaEditorLangPack()

  const element = document.createElement('div')
  document.body.append(element)
  console.log('[Media editor] appended wrapper');

  const dispose = render(() => <MediaEditor {...props} onClose={onClose} />, element)
  console.log('[Media editor] rendered jsx');

  function onClose() {
    props.onClose()
    dispose()
  }
}
