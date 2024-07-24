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
import MediaEditorContext, {HistoryItem} from './context';
import MainCanvas from './canvas/mainCanvas';
import FinishButton from './finishButton';
import {TextLayerInfo} from './canvas/resizableLayers';


type MediaEditorProps = {
  onClose: NoneToVoidFunction
  managers: AppManagers
}

export function MediaEditor(props: MediaEditorProps) {
  const history = createSignal<HistoryItem[]>([])
  const redoHistory = createSignal<HistoryItem[]>([])

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

  function pushToHistory(item: HistoryItem) {
    const [, setHistory] = history
    const [, setRedoHistory] = redoHistory
    setHistory(prev => [...prev, item])
    setRedoHistory([])
  }

  return (
    <MediaEditorContext.Provider value={{
      managers: props.managers,
      // imageSrc: 'tmp/texture4.png',
      imageSrc: 'tmp/texture3.jpg',
      pixelRatio: window.devicePixelRatio,
      renderingPayload: createSignal(),

      adjustments: createAdjustmentsConfig(),
      currentTab: createSignal('adjustments'),
      imageSize: createSignal([0, 0]),
      canvasSize: createSignal(),
      currentImageRatio: createSignal(0),
      scale: createSignal(1),
      rotation: createSignal(0),
      translation: createSignal([0, 0]),
      flip: createSignal([1, 1]),
      fixedImageRatioKey: createSignal(),

      resizableLayersSeed: 1,
      resizableLayers: createSignal([]),
      currentTextLayerInfo: createSignal<TextLayerInfo>({
        alignment: 'left',
        style: 'outline',
        color: '#ffffff',
        font: 'roboto',
        size: 40
      }),
      selectedResizableLayer: createSignal(),
      textLayersInfo: createSignal({}),
      stickersLayersInfo: createSignal({}),

      brushDrawnLines: createSignal([]),
      imageCanvas: createSignal(),
      currentBrush: createSignal({
        brush: 'pen',
        color: '#fe4438',
        size: 18
      }),

      history,
      redoHistory,
      pushToHistory
    }}>
      <div ref={overlay} class="media-editor__overlay night">
        <div class="media-editor__container">
          <MainCanvas />
          <div class="media-editor__toolbar">
            <MediaEditorTopbar onClose={handleClose} />
            <MediaEditorTabs />
            <MediaEditorTabContent tabs={{
              adjustments: () => <MediaEditorEqualizer />,
              crop: () => <MediaEditorCrop />,
              text: () => <MediaEditorText />,
              brush: () => <MediaEditorBrush />,
              stickers: () => <MediaEditorStickers />
            }} />
          </div>
          <FinishButton onClick={() => {}} />
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
