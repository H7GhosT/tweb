import {batch, createEffect, createSignal, on, onCleanup, onMount, useContext} from 'solid-js';

import {doubleRaf} from '../../helpers/schedulers';

import Topbar from './topbar';
import Tabs from './tabs/tabs';
import TabContent from './tabs/tabContent';
import AdjustmentsTab from './tabs/adjustmentsTab';
import CropTab from './tabs/cropTab';
import TextTab from './tabs/textTab';
import BrushTab from './tabs/brushTab';
import StickersTab from './tabs/stickersTab';
import MediaEditorContext from './context';
import {animateValue, delay, lerp} from './utils';
import useMediaQuery from './useMediaQuery';


export default function Toolbar(props: {
  onFinish: () => void;
  onClose: () => void;
}) {
  let toolbar: HTMLDivElement;

  const context = useContext(MediaEditorContext);
  const [isAdjusting] = context.isAdjusting;
  const [currentTab] = context.currentTab;
  const [renderingPayload] = context.renderingPayload;

  const [move, setMove] = createSignal(0)
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [extraMove, setExtraMove] = createSignal(0);

  const isMobile = useMediaQuery('(max-width: 800px)');

  const [shouldHide, setShouldHide] = createSignal(isMobile());

  let startY = 0;
  let isAborted = true;
  let isResetting = false;

  function resetMove() {
    if(isResetting) return;
    isResetting = true;

    startY = 0;
    isAborted = true;
    animateValue(move(), 0, 200, setMove);
    setTimeout(() => {
      isResetting = false;
    }, 200)
  }
  context.abortDrawerSlide = () => resetMove();

  onMount(() => {
    function startDrag(y: number) {
      if(!isMobile()) return;
      startY = y;
      isAborted = false
    }
    function dragMove(y: number) {
      if(!isMobile()) return;
      if(isAborted) return;
      const diff = y - startY;
      if(isCollapsed()) setMove(Math.min(Math.max(-containerHeight(), diff), 0));
      else setMove(Math.max(Math.min(containerHeight(), diff), 0))
    }
    function dragEnd() {
      if(!isMobile()) return;
      if(Math.abs(move()) > 100) {
        setIsCollapsed(prev => !prev);
      } else {
        resetMove();
      }
    }

    container().addEventListener('input', () => {
      resetMove();
    });

    toolbar.addEventListener('touchstart', (e) => {
      startDrag(e.touches[0].clientY);
    });
    toolbar.addEventListener('touchmove', (e) => {
      dragMove(e.touches[0].clientY);
    });
    toolbar.addEventListener('touchend', (e) => {
      dragEnd();
    });
    toolbar.addEventListener('mousedown', (e) => {
      startDrag(e.clientY);
    });
    toolbar.addEventListener('mousemove', (e) => {
      dragMove(e.clientY);
    });
    toolbar.addEventListener('mouseup', (e) => {
      dragEnd();
    });
    toolbar.addEventListener('mouseout', (e) => {
      dragEnd();
    });
  });

  createEffect(() => {
    const observer = new ResizeObserver(() => {
      setContainerHeight(container()?.clientHeight || 0);
    });
    observer.observe(container());
    onCleanup(() => observer.disconnect());
  });

  createEffect(on(isCollapsed, () => {
    const initialMove = move();
    const initialExtraMove = extraMove();
    const targetExtraMove = isCollapsed() ? containerHeight() : 0;
    animateValue(0, 1, 200, (progress) => {
      batch(() => {
        setMove(lerp(initialMove, 0, progress));
        setExtraMove(lerp(initialExtraMove, targetExtraMove, progress));
      })
    })
  }));

  createEffect(() => {
    if(currentTab() !== 'crop') setIsCollapsed(false);
  });

  createEffect(() => {
    if(renderingPayload() && shouldHide()) {
      (async() => {
        toolbar.style.transition = '.2s';
        await doubleRaf();
        setShouldHide(false);
        await delay(200);
        toolbar.style.removeProperty('transition');
      })();
    }
  })

  const totalMove = () => extraMove() + move();

  return (
    <div
      ref={toolbar}
      class="media-editor__toolbar"
      style={{
        'opacity': isMobile() && isAdjusting() ? 0 : 1,
        'transform': shouldHide() && isMobile() ?
          'translate(-50%, 100%)' :
           isMobile() ?
            `translate(-50%, ${totalMove()}px)` : undefined
      }}
    >
      <div class="media-editor__toolbar-draggable" />
      <Topbar onClose={props.onClose} onFinish={props.onFinish} />
      <Tabs />
      <TabContent
        onContainer={setContainer}
        onScroll={() => {
          resetMove();
        }}
        tabs={{
          adjustments: () => <AdjustmentsTab />,
          crop: () => <CropTab />,
          text: () => <TextTab />,
          brush: () => <BrushTab />,
          stickers: () => <StickersTab />
        }}
      />
    </div>
  )
}