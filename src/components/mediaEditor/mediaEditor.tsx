import {onCleanup, onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {NoneToVoidFunction} from '../../types';
import {doubleRaf} from '../../helpers/schedulers';
import {AppManagers} from '../../lib/appManagers/managers';

import appNavigationController from '../appNavigationController';

import {delay} from './utils';
import {injectMediaEditorLangPack} from './langPack';
import MediaEditorTabs from './mediaEditorTabs';
import MediaEditorTopbar from './mediaEditorTopbar';
import MediaEditorTabContent from './mediaEditorTabContent';
import MediaEditorEqualizer from './mediaEditorEqualizer';
import MediaEditorCrop from './mediaEditorCrop';
import MediaEditorText from './mediaEditorText';
import MediaEditorBrush from './mediaEditorBrush';
import MediaEditorStickers from './mediaEditorStickers';
import MediaEditorContext, {createStandaloneContextValue, HistoryItem, MediaEditorContextValue, StandaloneContext} from './context';
import MainCanvas from './canvas/mainCanvas';
import FinishButton from './finishButton';
import {withCurrentOwner} from './utils'
import {createFinalResult, MediaEditorFinalResult} from './createFinalResult';


export type MediaEditorProps = {
  onClose: NoneToVoidFunction
  managers: AppManagers
  onEditFinish: (result: MediaEditorFinalResult) => void
  imageURL: string
  standaloneContext?: StandaloneContext
}


export function MediaEditor(props: MediaEditorProps) {
  const standaloneContext = props.standaloneContext || createStandaloneContextValue(props)

  const [, setRenderingPayload] = standaloneContext.value.renderingPayload
  const [, setCanvasSize] = standaloneContext.value.canvasSize
  const [, setCurretTab] = standaloneContext.value.currentTab
  setRenderingPayload()
  setCanvasSize()
  setCurretTab('adjustments')

  let overlay: HTMLDivElement;

  onMount(async() => {
    console.log('[Media editor] mounted');
    overlay.classList.add('media-editor__overlay--hidden')
    await doubleRaf()
    overlay.classList.remove('media-editor__overlay--hidden')

    appNavigationController.pushItem({
      type: 'popup',
      onPop: () => props.onClose()
    })

    overlay.focus()
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
    <MediaEditorContext.Provider value={standaloneContext.value}>
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
          <FinishButton onClick={withCurrentOwner(async() => {
            const result = await createFinalResult(standaloneContext)
            props.onEditFinish(result)
            props.onClose()
          })} />
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
