import {createSignal, JSX, useContext} from 'solid-js';

import {i18n} from '../../lib/langPack';

import MediaEditorColorPicker from './mediaEditorColorPicker';
import MediaEditorRangeInput from './mediaEditorRangeInput';
import Space from './Space';
import MediaEditorLargeButton from './mediaEditorLargeButton';
import {ArrowBrush, BlurBrush, EraserBrush, MarkerBrush, NeonBrush, PenBrush} from './brushesSvg';
import MediaEditorContext from './context';

export default function MediaEditorBrush(props: {}) {
  const context = useContext(MediaEditorContext)
  const [currentBrush, setCurrentBrush] = context.currentBrush

  const brushButton = (text: JSX.Element, brushSvg: JSX.Element, brush: string) =>
    <MediaEditorLargeButton
      active={currentBrush().brush === brush}
      onClick={() => setCurrentBrush(prev => ({...prev, brush}))}
      class={`media-editor__brush-button`}
    >
      <div class="media-editor__brush-button-svg-wrapper">
        {brushSvg}
      </div>
      {text}
    </MediaEditorLargeButton>

  return (
    <>
      <MediaEditorColorPicker
        value={currentBrush().color}
        onChange={(color) => setCurrentBrush(prev => ({...prev, color}))}
      />
      <Space amount="16px" />
      <MediaEditorRangeInput
        label={i18n('MediaEditor.Size')}
        min={2}
        max={32}
        value={currentBrush().size}
        onChange={size => setCurrentBrush(prev => ({...prev, size}))}
        passiveLabel
      />
      <Space amount="16px" />
      <div class="media-editor__label">{i18n('MediaEditor.Tool')}</div>
      {brushButton(i18n('MediaEditor.Brushes.Pen'), <PenBrush />, 'pen')}
      {brushButton(i18n('MediaEditor.Brushes.Arrow'), <ArrowBrush />, 'arrow')}
      {brushButton(i18n('MediaEditor.Brushes.Brush'), <MarkerBrush />, 'brush')}
      {brushButton(i18n('MediaEditor.Brushes.Neon'), <NeonBrush />, 'neon')}
      {brushButton(i18n('MediaEditor.Brushes.Blur'), <BlurBrush />, 'blur')}
      {brushButton(i18n('MediaEditor.Brushes.Eraser'), <EraserBrush />, 'eraser')}
    </>
  )
}
