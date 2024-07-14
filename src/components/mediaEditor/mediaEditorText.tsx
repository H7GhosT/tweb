import {onMount, createSignal, Accessor, JSX} from 'solid-js';

import {i18n} from '../../lib/langPack';
import ripple from '../ripple';
import {IconTsx} from '../iconTsx';

import MediaEditorColorPicker from './mediaEditorColorPicker';
import MediaEditorRangeInput from './mediaEditorRangeInput';
import MediaEditorLargeButton from './mediaEditorLargeButton';
import Space from './Space';

export default function MediaEditorText(props: {}) {
  const [size, setSize] = createSignal(24)
  const [alignment, setAlignment] = createSignal('left')
  const [style, setStyle] = createSignal('normal')
  const [font, setFont] = createSignal('roboto')

  const toggleButton = (icon: Icon, value: string, currentValue: Accessor<string>, setValue: (value: string) => void) =>
    <div
      class="media-editor__toggle-button"
      classList={{'media-editor__toggle-button--active': value === currentValue()}}
      onClick={() => setValue(value)}
    >
      <IconTsx icon={icon} />
    </div>

  onMount(() => {
    document.querySelectorAll('.media-editor__toggle-button').forEach((element) => {
      ripple(element as HTMLElement)
    })
  })

  const fontButton = (text: JSX.Element, textFont: string) =>
    <MediaEditorLargeButton
      active={font() === textFont}
      onClick={() => setFont(textFont)}
      class={`media-editor__font-button--${textFont}`}
    >
      {text}
    </MediaEditorLargeButton>

  return (
    <>
      <MediaEditorColorPicker />

      <div class="media-editor__toggle-group-row">
        <div class="media-editor__toggle-group">
          {toggleButton('align_left', 'left', alignment, setAlignment)}
          {toggleButton('align_center', 'center', alignment, setAlignment)}
          {toggleButton('align_right', 'right', alignment, setAlignment)}
        </div>

        <div class="media-editor__toggle-group">
          {toggleButton('fontframe', 'normal', style, setStyle)}
          {toggleButton('fontframe_outline', 'outline', style, setStyle)}
          {toggleButton('fontframe_bg', 'background', style, setStyle)}
        </div>
      </div>

      <MediaEditorRangeInput label={i18n('MediaEditor.Size')} min={8} max={40} value={size()} onChange={setSize} passiveLabel />

      <Space amount="16px" />

      <div class="media-editor__label">{i18n('MediaEditor.Font')}</div>

      {fontButton(i18n('MediaEditor.Fonts.Roboto'), 'roboto')}
      {fontButton(i18n('MediaEditor.Fonts.TimesNewRoman'), 'times')}
      {fontButton(i18n('MediaEditor.Fonts.SegoeUI'), 'segoe-ui')}
    </>
  )
}
