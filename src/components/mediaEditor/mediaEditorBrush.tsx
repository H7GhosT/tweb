import {createSignal, JSX} from 'solid-js';

import {i18n} from '../../lib/langPack';

import MediaEditorColorPicker from './mediaEditorColorPicker';
import MediaEditorRangeInput from './mediaEditorRangeInput';
import Space from './Space';
import MediaEditorLargeButton from './mediaEditorLargeButton';
import {ArrowBrush, BlurBrush, EraserBrush, MarkerBrush, NeonBrush, PenBrush} from './brushesSvg';

export default function MediaEditorBrush(props: {}) {
  const [size, setSize] = createSignal(24)
  const [brush, setBrush] = createSignal('pen')

  const brushButton = (text: JSX.Element, brushSvg: JSX.Element, brushName: string) =>
    <MediaEditorLargeButton
      active={brush() === brushName}
      onClick={() => setBrush(brushName)}
      class={`media-editor__brush-button`}
    >
      <div class="media-editor__brush-button-svg-wrapper">
        {brushSvg}
      </div>
      {text}
    </MediaEditorLargeButton>

  return (
    <>
      <MediaEditorColorPicker />
      <Space amount="16px" />
      <MediaEditorRangeInput label={i18n('MediaEditor.Size')} min={8} max={40} value={size()} onChange={setSize} passiveLabel />
      <Space amount="16px" />
      <div class="media-editor__label">{i18n('MediaEditor.Tool')}</div>
      {brushButton(i18n('MediaEditor.Brushes.Pen'), <PenBrush />, 'pen')}
      {brushButton(i18n('MediaEditor.Brushes.Arrow'), <ArrowBrush />, 'Arrow')}
      {brushButton(i18n('MediaEditor.Brushes.Brush'), <MarkerBrush />, 'Brush')}
      {brushButton(i18n('MediaEditor.Brushes.Neon'), <NeonBrush />, 'Neon')}
      {brushButton(i18n('MediaEditor.Brushes.Blur'), <BlurBrush />, 'Blur')}
      {brushButton(i18n('MediaEditor.Brushes.Eraser'), <EraserBrush />, 'eraser')}
    </>
  )
}
