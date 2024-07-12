import {onMount, createSignal, Accessor} from 'solid-js';

import ripple from '../ripple';
import {IconTsx} from '../iconTsx';

import MediaEditorColorPicker from './mediaEditorColorPicker';
import MediaEditorRangeInput from './mediaEditorRangeInput';
import {i18n} from '../../lib/langPack';

export default function MediaEditorText(props: {}) {
  const [size, setSize] = createSignal(24)
  const [alignment, setAlignment] = createSignal('left')
  const [style, setStyle] = createSignal('normal')

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
      console.log('element', element)
      ripple(element as HTMLElement)
    })
  })

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
    </>
  )
}
