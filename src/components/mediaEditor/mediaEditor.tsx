import {createEffect, onMount} from 'solid-js';
import {render} from 'solid-js/web';

import {doubleRaf} from '../../helpers/schedulers';
import {AppManagers} from '../../lib/appManagers/managers';
import {i18n} from '../../lib/langPack';

import appNavigationController from '../appNavigationController';

import {delay} from './utils';
import {injectMediaEditorLangPack} from './langPack';
import MediaEditorContext, {createStandaloneContextValue, StandaloneContext} from './context';
import MainCanvas from './canvas/mainCanvas';
import FinishButton from './finishButton';
import {withCurrentOwner} from './utils';
import {createFinalResult, MediaEditorFinalResult} from './finalRender/createFinalResult';
import Toolbar from './toolbar';
import confirmationPopup from '../confirmationPopup';

export type MediaEditorProps = {
  onClose: (hasGif: boolean) => void;
  managers: AppManagers;
  onEditFinish: (result: MediaEditorFinalResult) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onImageRendered: () => void;
  imageURL: string;
  standaloneContext?: StandaloneContext;
};

export function MediaEditor(props: MediaEditorProps) {
  const standaloneContext = props.standaloneContext || createStandaloneContextValue(props);

  const [, setRenderingPayload] = standaloneContext.value.renderingPayload;
  const [, setCanvasSize] = standaloneContext.value.canvasSize;
  const [, setCurretTab] = standaloneContext.value.currentTab;
  setRenderingPayload();
  setCanvasSize();
  setCurretTab('adjustments');

  const [imageCanvas] = standaloneContext.value.imageCanvas;
  const [renderingPayload] = standaloneContext.value.renderingPayload;

  let overlay: HTMLDivElement;

  onMount(async() => {
    overlay.classList.add('media-editor__overlay--hidden');
    await doubleRaf();
    overlay.classList.remove('media-editor__overlay--hidden');

    appNavigationController.pushItem({
      type: 'popup',
      onPop: () => void handleClose()
    });

    overlay.focus();
  });

  createEffect(() => {
    if(!imageCanvas()) return;
    props.onCanvasReady(imageCanvas());
  });

  createEffect(() => {
    if(!renderingPayload()) return;
    props.onImageRendered();
  });

  async function handleClose(finished = false, hasGif = false) {
    async function performClose() {
      overlay.classList.add('media-editor__overlay--hidden');
      await delay(200);
      props.onClose(hasGif);
    }

    if(!finished && !props.standaloneContext) {
      if(standaloneContext.value.history[0]().length > 0) {
        const confirmed = await confirmationPopup({
          title: i18n('MediaEditor.DiscardChanges'),
          description: i18n('MediaEditor.DiscardWarning'),
          button: {
            text: i18n('Discard')
          }
        });
        if(!confirmed) return;
      }
      standaloneContext.dispose();
      performClose();
    } else {
      await performClose();
    }
  }

  return (
    <MediaEditorContext.Provider value={standaloneContext.value}>
      <div ref={overlay} class="media-editor__overlay night">
        <div class="media-editor__container">
          {(() => {
            // Need to be inside context
            const handleFinish = withCurrentOwner(async() => {
              const result = await createFinalResult(standaloneContext);
              props.onEditFinish(result);
              handleClose(true, result.isGif);
            });

            return <>
              <MainCanvas />
              <Toolbar onClose={handleClose} onFinish={handleFinish} />
              <FinishButton
                onClick={handleFinish}
              />
            </>
          })()}
        </div>
      </div>
    </MediaEditorContext.Provider>
  );
}

export function openMediaEditor(props: MediaEditorProps) {
  injectMediaEditorLangPack();

  const element = document.createElement('div');
  document.body.append(element);

  const dispose = render(() => <MediaEditor {...props} onClose={onClose} />, element);

  function onClose(hasGif: boolean) {
    props.onClose(hasGif);
    dispose();
  }
}
