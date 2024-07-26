import {onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {NoneToVoidFunction} from '../../types';
import {doubleRaf} from '../../helpers/schedulers';
import {AppManagers} from '../../lib/appManagers/managers';

import appNavigationController from '../appNavigationController';

import {delay} from './utils';
import {injectMediaEditorLangPack} from './langPack';
import Topbar from './topbar';
import Tabs from './tabs/tabs';
import TabContent from './tabs/tabContent';
import AdjustmentsTab from './tabs/adjustmentsTab';
import CropTab from './tabs/cropTab';
import TextTab from './tabs/textTab';
import BrushTab from './tabs/brushTab';
import StickersTab from './tabs/stickersTab';
import MediaEditorContext, {createStandaloneContextValue, StandaloneContext} from './context';
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
    overlay.classList.add('media-editor__overlay--hidden')
    await doubleRaf()
    overlay.classList.remove('media-editor__overlay--hidden')

    appNavigationController.pushItem({
      type: 'popup',
      onPop: () => props.onClose()
    })

    overlay.focus()
  })


  async function handleClose(finished = false) {
    overlay.classList.add('media-editor__overlay--hidden')
    await delay(200)
    props.onClose()
    if(!finished && !props.standaloneContext) standaloneContext.dispose()
  }


  return (
    <MediaEditorContext.Provider value={standaloneContext.value}>
      <div ref={overlay} class="media-editor__overlay night">
        <div class="media-editor__container">
          <MainCanvas />
          <div class="media-editor__toolbar">
            <Topbar onClose={handleClose} />
            <Tabs />
            <TabContent tabs={{
              adjustments: () => <AdjustmentsTab />,
              crop: () => <CropTab />,
              text: () => <TextTab />,
              brush: () => <BrushTab />,
              stickers: () => <StickersTab />
            }} />
          </div>
          <FinishButton onClick={withCurrentOwner(async() => {
            const result = await createFinalResult(standaloneContext)
            props.onEditFinish(result)
            handleClose(true)
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

  const dispose = render(() => <MediaEditor {...props} onClose={onClose} />, element)

  function onClose() {
    props.onClose()
    dispose()
  }
}
