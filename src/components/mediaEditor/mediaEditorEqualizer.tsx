import {createSignal} from 'solid-js';

import MediaEditorRangeInput from './mediaEditorRangeInput';

export default function MediaEditorEqualizer(props: {}) {
  const [value, setValue] = createSignal(0)
  const [value2, setValue2] = createSignal(0)

  return (
    <>
      <MediaEditorRangeInput value={value()} onChange={setValue} label="Enhance I18n" min={0} max={100} />
      <div style={{margin: '32px'}} />
      <MediaEditorRangeInput value={value2()} onChange={setValue2} label="Brightness I18n" min={-50} max={50} />
    </>
  )
}
