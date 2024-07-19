import {createEffect, createResource, createSignal, For, onMount, Show, useContext} from 'solid-js';
import EmoticonsSearch from '../emoticonsDropdown/search';
import {Document, EmojiGroup, StickerSet} from '../../layer';
import LazyLoadQueue from '../lazyLoadQueue';
import wrapStickerSetThumb from '../wrappers/stickerSetThumb';
import createMiddleware from '../../helpers/solid/createMiddleware';
import {IconTsx} from '../iconTsx';
import wrapSticker from '../wrappers/sticker';
import wrapEmojiText from '../../lib/richTextProcessor/wrapEmojiText';
import Space from './Space';
import {i18n} from '../../lib/langPack';
import {ScrollableX} from '../scrollable';
import MediaEditorContext from './context';
import {ResizableLayer} from './canvas/resizableLayers';

// TODO: Don't forget favorites

export default function MediaEditorStickers() {
  const context = useContext(MediaEditorContext)
  const {managers} = context
  const [, setLayers] = context.resizableLayers
  const [canvasResolution] = context.canvasResolution
  const [, setSelectedResizableLayer] = context.selectedResizableLayer
  const [search, setSearch] = createSignal('')
  const [group, setGroup] = createSignal<EmojiGroup>()
  const [recentStickers] = createResource(() => managers.appStickersManager.getRecentStickersStickers())
  const [stickerSets] = createResource(() => managers.appStickersManager.getAllStickers())

  const lazyLoadQueue = new LazyLoadQueue(1)

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

  function Sticker(props: {
    doc: Document.document
  }) {
    let container: HTMLDivElement

    onMount(() => {
      wrapSticker({
        div: container,
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

    function onClick() {
      const id = context.resizableLayersSeed++
      setLayers(prev => [
        ...prev,
        createSignal<ResizableLayer>({
          id,
          position: [canvasResolution()[0] / 2, canvasResolution()[1] / 2],
          rotation: 0,
          scale: 1,
          type: 'sticker',
          sticker: props.doc
        })
      ])
      setSelectedResizableLayer(id)
    }

    return (
      <div
        ref={container}
        class='media-editor__stickers-grid-item'
        onClick={onClick}
      />
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

  createEffect(() => {
    if(!stickerSets()) return
    new ScrollableX(thumbsListScrollable)
  })

  return (
    <>
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
    </>
  )
}
