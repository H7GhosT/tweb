import {createSignal, JSX, onMount, splitProps} from 'solid-js';

import {i18n} from '../../lib/langPack';
import {IconTsx} from '../iconTsx';
import ripple from '../ripple';

const ratioRects = {
  '1x1': () => <rect x="4" y="4" width="16" height="16" rx="2" stroke="white" stroke-width="1.66"/>,
  '3x2': () => <rect x="3" y="6" width="18" height="12" rx="2" stroke="white" stroke-width="1.66"/>,
  '4x3': () => <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" stroke-width="1.66"/>,
  '5x4': () => <rect x="3" y="4.5" width="18" height="15" rx="2" stroke="white" stroke-width="1.66"/>,
  '7x5': () => <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" stroke-width="1.66"/>,
  '16x9': () => <rect x="2.5" y="6.5" width="19" height="11" rx="2" stroke="white" stroke-width="1.66"/>
}

const ratioIcon = (ratio: keyof typeof ratioRects, rotated?: boolean) =>
  <svg classList={{'media-editor__crop-item-icon--rotated': rotated}} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {ratioRects[ratio]()}
  </svg>

function Item(inProps: {
  icon: JSX.Element
  text: JSX.Element
  active: boolean
} & JSX.HTMLAttributes<HTMLDivElement>) {
  const [props, divProps] = splitProps(inProps, ['icon', 'text', 'active'])

  let element: HTMLDivElement

  onMount(() => {
    ripple(element)
  })

  return (
    <div
      {...divProps}
      ref={element}
      class="media-editor__crop-item"
      classList={{'media-editor__crop-item--active': props.active}}
    >
      {props.icon}
      {props.text}
    </div>
  );
}

export default function MediaEditorCrop(props: {}) {
  const [active, setActive] = createSignal('free')

  const isActive = (what: string) => active() === what

  return (
    <>
      <div class="media-editor__label">{i18n('MediaEditor.AspectRatio')}</div>

      <Item icon={<IconTsx icon="free_transform" />} text={i18n('MediaEditor.Free')} active={isActive('free')} onClick={() => setActive('free')} />
      <Item icon={<IconTsx icon="image_original" />} text={i18n('MediaEditor.Original')} active={isActive('original')} onClick={() => setActive('original')} />
      <Item icon={ratioIcon('1x1')} text={i18n('MediaEditor.Square')} active={isActive('1x1')} onClick={() => setActive('1x1')} />

      <div class="media-editor__crop-grid">
        <Item icon={ratioIcon('3x2')} text="3:2" active={isActive('3x2')} onClick={() => setActive('3x2')} />
        <Item icon={ratioIcon('3x2', true)} text="2:3" active={isActive('2x3')} onClick={() => setActive('2x3')} />

        <Item icon={ratioIcon('4x3')} text="4:3" active={isActive('4x3')} onClick={() => setActive('4x3')} />
        <Item icon={ratioIcon('4x3', true)} text="3:4" active={isActive('3x4')} onClick={() => setActive('3x4')} />

        <Item icon={ratioIcon('5x4')} text="5:4" active={isActive('5x4')} onClick={() => setActive('5x4')} />
        <Item icon={ratioIcon('5x4', true)} text="4:5" active={isActive('4x5')} onClick={() => setActive('4x5')} />

        <Item icon={ratioIcon('7x5')} text="7:5" active={isActive('7x5')} onClick={() => setActive('7x5')} />
        <Item icon={ratioIcon('7x5', true)} text="5:7" active={isActive('5x7')} onClick={() => setActive('5x7')} />

        <Item icon={ratioIcon('16x9')} text="16:9" active={isActive('16x9')} onClick={() => setActive('16x9')} />
        <Item icon={ratioIcon('16x9', true)} text="9:16" active={isActive('9x16')} onClick={() => setActive('9x16')} />
      </div>
    </>
  );
}