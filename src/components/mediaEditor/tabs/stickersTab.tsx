import {createEffect, createResource, createSignal, For, onCleanup, onMount, Show, useContext} from 'solid-js';

import {Document, EmojiGroup, StickerSet} from '../../../layer';
import wrapEmojiText from '../../../lib/richTextProcessor/wrapEmojiText';
import {i18n} from '../../../lib/langPack';

import EmoticonsSearch from '../../emoticonsDropdown/search';
import LazyLoadQueue from '../../lazyLoadQueue';
import wrapStickerSetThumb from '../../wrappers/stickerSetThumb';
import createMiddleware from '../../../helpers/solid/createMiddleware';
import {IconTsx} from '../../iconTsx';
import {ScrollableX} from '../../scrollable';
import SuperStickerRenderer from '../../emoticonsDropdown/tabs/SuperStickerRenderer';

import useNormalizePoint from '../canvas/useNormalizePoint';
import Space from '../space';
import MediaEditorContext from '../context';
import {ResizableLayer} from '../types';
import {delay} from '../utils';

import {TabContentContext} from './tabContent';

export default function StickersTab() {
  const context = useContext(MediaEditorContext);
  const {container, scrollAmount} = useContext(TabContentContext);

  const {managers} = context;
  const [, setLayers] = context.resizableLayers;
  const [canvasSize] = context.canvasSize;
  const [, setSelectedResizableLayer] = context.selectedResizableLayer;
  const [finalTransform] = context.finalTransform

  const normalizePoint = useNormalizePoint()

  const [recentStickers] = createResource(() => managers.appStickersManager.getRecentStickersStickers());
  const [stickerSets] = createResource(() => managers.appStickersManager.getAllStickers());
  const [filteredStickers, setFilteredStickers] = createSignal<Document.document[]>();

  const [search, setSearch] = createSignal('');
  const [group, setGroup] = createSignal<EmojiGroup>();
  const [activeSet, setActiveSet] = createSignal('recent');
  const [scrolling, setScrolling] = createSignal(false);

  const [intersectionObserver, setIntersectionObserver] = createSignal<IntersectionObserver>();
  const [recentLabel, setRecentLabel] = createSignal<HTMLDivElement>();

  const lazyLoadQueue = new LazyLoadQueue();
  const stickerRenderer = new SuperStickerRenderer({
    regularLazyLoadQueue: lazyLoadQueue,
    group: 'none',
    managers,
    intersectionObserverInit: {root: container()},
    withLock: false
  });

  onCleanup(() => {
    stickerRenderer.destroy();
    lazyLoadQueue.clear();
  });

  async function onStickerSetThumbClick(id: string) {
    setActiveSet(String(id));
    setScrolling(true);
    container()?.querySelector(`[data-set-id="${id}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    await delay(1000);
    setScrolling(false);
  }

  function StickerSetThumb(props: {set: StickerSet.stickerSet}) {
    let renderContainer: HTMLDivElement;

    onMount(() => {
      wrapStickerSetThumb({
        container: renderContainer,
        group: 'none',
        autoplay: true,
        width: 30,
        height: 30,
        lazyLoadQueue,
        middleware: createMiddleware().get(),
        set: props.set,
        managers,
        textColor: 'white'
      });
    });

    const isActive = () => String(props.set.id) === activeSet();

    return (
      <div
        ref={renderContainer}
        class="media-editor__stickers-set-thumb"
        classList={{
          'media-editor__stickers-set-thumb--active': isActive()
        }}
        onClick={() => onStickerSetThumbClick(String(props.set.id))}
      />
    );
  }

  function Sticker(props: {doc: Document.document}) {
    let container: HTMLDivElement;

    onMount(() => {
      stickerRenderer.renderSticker(props.doc, container);
      stickerRenderer.observeAnimated(container);
    });

    function onClick() {
      const id = context.resizableLayersSeed++;
      const transform = finalTransform()
      const newLayer = {
        id,
        position: normalizePoint([canvasSize()[0] / 2, canvasSize()[1] / 2]),
        rotation: -transform.rotation,
        scale: 1 / transform.scale,
        type: 'sticker',
        sticker: props.doc
      } as ResizableLayer;
      setLayers((prev) => [...prev, createSignal<ResizableLayer>({...newLayer})]);
      setSelectedResizableLayer(id);

      let position = 0;
      let deletedLayer: ResizableLayer;

      context.pushToHistory({
        undo() {
          setLayers((prev) => {
            prev = [...prev];
            position = prev.findIndex((layer) => layer[0]().id === newLayer.id);
            if(position > -1) deletedLayer = prev.splice(position, 1)[0]?.[0]();
            return prev;
          });
        },
        redo() {
          setLayers((prev) => {
            prev = [...prev];
            if(position > -1) prev.splice(position, 0, createSignal({...deletedLayer}));
            return prev;
          });
        }
      });
    }

    return <div ref={container} class="media-editor__stickers-grid-item" onClick={onClick} />;
  }

  function StickerSetLabel(props: {set: StickerSet.stickerSet}) {
    let label: HTMLDivElement;

    createEffect(() => {
      if(intersectionObserver()) {
        intersectionObserver().observe(label);
        onCleanup(() => {
          intersectionObserver()?.unobserve(label);
        });
      }
    });

    return (
      <div ref={label} data-set-id={props.set.id} class="media-editor__label">
        {wrapEmojiText(props.set.title)}
      </div>
    );
  }

  function StickerSetSection(props: {set: StickerSet.stickerSet}) {
    const [stickers] = createResource(() => managers.appStickersManager.getStickerSet(props.set));

    return (
      <Show when={stickers()}>
        <Space amount="16px" />
        <StickerSetLabel set={props.set} />
        <div class="media-editor__stickers-grid">
          <For each={stickers().documents}>{(doc) => <Sticker doc={doc as Document.document} />}</For>
        </div>
      </Show>
    );
  }

  function ThumbList() {
    let thumbsListScrollable: HTMLDivElement;

    onMount(() => {
      document.querySelector('.media-editor__tabs')?.append(thumbsListScrollable);
      new ScrollableX(thumbsListScrollable);
    });
    onCleanup(() => {
      thumbsListScrollable.remove();
    });

    const visible = () => stickerSets() && !filteredStickers();
    <div
      class="media-editor__stickers-thumb-list-scrollable"
      classList={{
        'media-editor__stickers-thumb-list-scrollable--hidden': !visible(),
        'media-editor__stickers-thumb-list-scrollable--has-scroll': scrollAmount() > 8
      }}
      ref={thumbsListScrollable}
    >
      <div class="media-editor__stickers-thumb-list">
        <Show when={recentStickers()?.length}>
          <div
            class="media-editor__stickers-recent-button"
            classList={{
              'media-editor__stickers-recent-button--active': activeSet() === 'recent'
            }}
            onClick={() => onStickerSetThumbClick('recent')}
          >
            <IconTsx icon="recent" />
          </div>
        </Show>
        <For each={stickerSets()?.sets}>{(set) => <StickerSetThumb set={set} />}</For>
      </div>
    </div>;
    return <></>;
  }


  createEffect(() => {
    setIntersectionObserver(
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if(!scrolling() && entry.isIntersecting) {
              const id = (entry.target as HTMLDivElement).dataset.setId;
              if(id) setActiveSet(id);
            }
          });
        },
        {
          root: container(),
          rootMargin: `0px 0px -${container().clientHeight - 100}px 0px`
        }
      )
    );

    onCleanup(() => {
      intersectionObserver()?.disconnect();
    });
  });

  createEffect(() => {
    if(intersectionObserver() && recentLabel()) {
      intersectionObserver().observe(recentLabel());
      onCleanup(() => {
        intersectionObserver()?.unobserve(recentLabel());
      });
    }
  });

  createEffect(async() => {
    if(search()) {
      setFilteredStickers(await managers.appStickersManager.searchStickers(search()));
      return;
    }
    if(group()) {
      const g = group();
      if(g._ === 'emojiGroupPremium') {
        setFilteredStickers(await managers.appStickersManager.getPremiumStickers());
        return;
      }
      setFilteredStickers(
        await managers.appStickersManager.getStickersByEmoticon({
          emoticon: g.emoticons,
          includeServerStickers: true
        })
      );

      return;
    }
    if(!group() && !search()) {
      setFilteredStickers();
    }
  });

  return (
    <>
      <ThumbList />

      <Space amount={filteredStickers() ? '0px' : '48px'} />
      <Space amount="8px" />

      <div class="media-editor__sticker-search">
        <EmoticonsSearch
          type="stickers"
          onValue={(value) => {
            setSearch(value);
          }}
          onGroup={(group) => {
            setGroup(group);
          }}
          categoryColor="white"
          animatedItemGroup="none"
        />
      </div>

      {/* TODO: Favorties */}
      <Space amount="16px" />

      <Show when={recentStickers()?.length > 0 && !filteredStickers()}>
        <div ref={setRecentLabel} class="media-editor__label" data-set-id="recent">
          {i18n('MediaEditor.RecentlyUsed')}
        </div>

        <div class="media-editor__stickers-grid">
          <For each={recentStickers()}>{(doc) => <Sticker doc={doc} />}</For>
        </div>
      </Show>

      <Show when={filteredStickers()}>
        <div class="media-editor__stickers-grid">
          <For each={filteredStickers()}>{(doc) => <Sticker doc={doc} />}</For>
        </div>
      </Show>

      <Show when={stickerSets() && !filteredStickers()}>
        <For each={stickerSets().sets}>{(set) => <StickerSetSection set={set} />}</For>
      </Show>
    </>
  );
}