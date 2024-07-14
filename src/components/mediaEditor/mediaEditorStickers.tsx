import {createEffect, createResource, createSignal, For, onMount, Show, useContext} from 'solid-js';
import EmoticonsSearch from '../emoticonsDropdown/search';
import AppManagersContext from './AppManagersContext';
import {Document, EmojiGroup, StickerSet} from '../../layer';
import LazyLoadQueue from '../lazyLoadQueue';
import wrapStickerSetThumb from '../wrappers/stickerSetThumb';
import createMiddleware from '../../helpers/solid/createMiddleware';
import {IconTsx} from '../iconTsx';
import wrapSticker from '../wrappers/sticker';
import wrapEmojiText from '../../lib/richTextProcessor/wrapEmojiText';
import Space from './Space';
import {i18n} from '../../lib/langPack';
import Scrollable, {ScrollableX} from '../scrollable';

// Don't forget favorites

export default function MediaEditorStickers(props: {}) {
  const managers = useContext(AppManagersContext)
  const [search, setSearch] = createSignal('')
  const [group, setGroup] = createSignal<EmojiGroup>()
  const [recentStickers] = createResource(() => managers.appStickersManager.getRecentStickersStickers())
  const [stickerSets] = createResource(() => managers.appStickersManager.getAllStickers())

  const lazyLoadQueue = new LazyLoadQueue(1)

  let containerScrollable: HTMLDivElement
  let thumbsListScrollable: HTMLDivElement

  function StickerSetThumb(props: {
    set: StickerSet.stickerSet
  }) {
    let renderContainer: HTMLDivElement

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
      })
    })

    return (
      <div ref={renderContainer} class='media-editor__stickers-set-thumb' />
    )
  }

  // wrapEmojiText(set.title)

  function Sticker(props: {
    doc: Document.document
  }) {
    let renderContainer: HTMLDivElement

    onMount(() => {
      wrapSticker({
        div: renderContainer,
        doc: props.doc,
        group: 'none',
        width: 70,
        height: 70,
        lazyLoadQueue,
        middleware: createMiddleware().get(),
        managers,
        textColor: 'white'
      })
    })

    return (
      <div ref={renderContainer} class='media-editor__stickers-grid-item' />
    )
  }

  function StickerSetLabel(props: {
    set: StickerSet.stickerSet
  }) {
    return (
      <div class='media-editor__label'>{wrapEmojiText(props.set.title)}</div>
    )
  }

  function StickerSetSection(props: {
    set: StickerSet.stickerSet
  }) {
    const [stickers] = createResource(() => managers.appStickersManager.getStickerSet(props.set))

    return (
      <Show when={stickers()}>
        <Space amount="16px" />
        <StickerSetLabel set={props.set} />
        <div class='media-editor__stickers-grid'>
          <For each={stickers().documents}>
            {doc => <Sticker doc={doc as Document.document} />}
          </For>
        </div>
      </Show>
    )
  }

  onMount(() => {
    new Scrollable(containerScrollable)
  })

  createEffect(() => {
    if(!stickerSets()) return
    new ScrollableX(thumbsListScrollable)
  })

  return (
    <div class='media-editor__stickers-container-scrollable' ref={containerScrollable}>
      <div class='media-editor__stickers-container'>
        <div class='media-editor__stickers-thumb-list-scrollable' ref={thumbsListScrollable}>
          <div class='media-editor__stickers-thumb-list'>
            <Show when={stickerSets()}>
              <Show when={recentStickers()?.length}>
                <div class='media-editor__stickers-recent-button'>
                  <IconTsx icon='recent' />
                </div>
              </Show>
              <For each={stickerSets().sets}>
                {set => <StickerSetThumb set={set} />}
              </For>
            </Show>
          </div>
        </div>

        <Space amount="8px" />

        <div class='media-editor__sticker-search'>
          <EmoticonsSearch type="stickers" onValue={(value) => {
            console.log('[Media Editor] search', value)
            setSearch(value)
          }} onGroup={(group) => {
            console.log('[Media Editor] group', group)
            setGroup(group)
          }} categoryColor='white' />
        </div>

        {/* TODO: Favorties */}

        <Show when={recentStickers()?.length > 0}>
          <Space amount="16px" />
          <div class='media-editor__label'>{i18n('MediaEditor.RecentlyUsed')}</div>

          <div class='media-editor__stickers-grid'>
            <For each={recentStickers()}>
              {doc => <Sticker doc={doc} />}
            </For>
          </div>
        </Show>

        <Show when={stickerSets()}>
          <For each={stickerSets().sets}>
            {set => <StickerSetSection set={set} />}
          </For>
        </Show>
      </div>
    </div>
  )
}
