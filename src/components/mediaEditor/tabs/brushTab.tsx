import {createEffect, JSX, useContext} from 'solid-js';

import {i18n} from '../../../lib/langPack';

import ColorPicker from '../colorPicker';
import RangeInput from '../rangeInput';
import Space from '../space';
import LargeButton from '../largeButton';
import {ArrowBrush, BlurBrush, EraserBrush, MarkerBrush, NeonBrush, PenBrush} from '../brushesSvg';
import MediaEditorContext from '../context';
import {createStoredColor} from '../createStoredColor';


export default function BrushTab() {
  const context = useContext(MediaEditorContext)
  const [currentBrush, setCurrentBrush] = context.currentBrush

  const savedBrushColors = {
    pen: createStoredColor('media-editor-pen-color', '#fe4438'),
    arrow: createStoredColor('media-editor-arrow-color', '#ffd60a'),
    brush: createStoredColor('media-editor-brush-color', '#ff8901'),
    neon: createStoredColor('media-editor-neon-color', '#62e5e0')
  }

  function savedBrushSignal(brush: string) {
    return savedBrushColors[brush as keyof typeof savedBrushColors]
  }

  createEffect(() => {
    const [savedColor] = savedBrushSignal(currentBrush().brush) || []
    if(!savedColor || currentBrush().color === savedColor().value) return
    setCurrentBrush(prev => ({
      ...prev,
      color: savedColor().value
    }))
  })

  function setColor(color: string) {
    const brush = currentBrush().brush
    const [, setSavedColor] = savedBrushSignal(brush) || []
    setSavedColor?.(color)
  }

  const brushButton = (text: JSX.Element, brushSvg: JSX.Element, brush: string) =>
    <LargeButton
      active={currentBrush().brush === brush}
      onClick={() => setCurrentBrush(prev => ({...prev, brush}))}
      class={`media-editor__brush-button`}
    >
      <div class="media-editor__brush-button-svg-wrapper" style={{
        color: savedBrushSignal(brush)?.[0]().value
      }}>
        {brushSvg}
      </div>
      {text}
    </LargeButton>

  const hasColor = () => currentBrush().brush in savedBrushColors

  return (
    <>
      <div style={!hasColor() ? {
        'opacity': .25,
        'pointer-events': 'none'
      } : undefined}>
        <ColorPicker
          value={currentBrush().color}
          onChange={setColor}
          colorKey={currentBrush().brush}
          previousColor={savedBrushSignal(currentBrush().brush)?.[0]().previous}
        />
      </div>
      <Space amount="16px" />
      <RangeInput
        label={i18n('MediaEditor.Size')}
        min={2}
        max={32}
        value={currentBrush().size}
        onChange={size => setCurrentBrush(prev => ({...prev, size}))}
        passiveLabel
        color={hasColor() ? currentBrush().color : undefined}
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
