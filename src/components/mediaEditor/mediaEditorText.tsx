import {onMount, Accessor, JSX, useContext, createEffect} from 'solid-js';

import {i18n} from '../../lib/langPack';

import ripple from '../ripple';
import {IconTsx} from '../iconTsx';

import MediaEditorColorPicker from './mediaEditorColorPicker';
import MediaEditorRangeInput from './mediaEditorRangeInput';
import MediaEditorLargeButton from './mediaEditorLargeButton';
import Space from './Space';
import MediaEditorContext from './context';
import {createStoredColor} from './createStoredColor';


export default function MediaEditorText() {
  const context = useContext(MediaEditorContext)
  const [layerInfo, setLayerInfo] = context.currentTextLayerInfo

  const [savedColor, setSavedColor] = createStoredColor('media-editor-text-color', '#ffffff')

  createEffect(() => {
    setLayerInfo(prev => ({...prev, color: savedColor().value}))
  })

  function setSize(value: number) {
    setLayerInfo(prev => ({...prev, size: value}))
  }
  function setAlignment(value: string) {
    setLayerInfo(prev => ({...prev, alignment: value}))
  }
  function setStyle(value: string) {
    setLayerInfo(prev => ({...prev, style: value}))
  }
  function setFont(value: string) {
    setLayerInfo(prev => ({...prev, font: value}))
  }

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
      active={layerInfo()?.font === textFont}
      onClick={() => setFont(textFont)}
      class={`media-editor__font-button--${textFont}`}
    >
      {text}
    </MediaEditorLargeButton>

  return (
    <>
      <MediaEditorColorPicker
        value={layerInfo()?.color}
        onChange={setSavedColor}
        previousColor={savedColor().previous}
      />

      <div class="media-editor__toggle-group-row">
        <div class="media-editor__toggle-group">
          {toggleButton('align_left', 'left', () => layerInfo()?.alignment, setAlignment)}
          {toggleButton('align_center', 'center', () => layerInfo()?.alignment, setAlignment)}
          {toggleButton('align_right', 'right', () => layerInfo()?.alignment, setAlignment)}
        </div>

        <div class="media-editor__toggle-group">
          {toggleButton('fontframe', 'normal', () => layerInfo()?.style, setStyle)}
          {toggleButton('fontframe_outline', 'outline', () => layerInfo()?.style, setStyle)}
          {toggleButton('fontframe_bg', 'background', () => layerInfo()?.style, setStyle)}
        </div>
      </div>

      <MediaEditorRangeInput
        label={i18n('MediaEditor.Size')}
        min={16}
        max={64}
        value={layerInfo()?.size}
        onChange={setSize}
        passiveLabel
        color={layerInfo()?.color}
      />

      <Space amount="16px" />

      <div class="media-editor__label">{i18n('MediaEditor.Font')}</div>

      {fontButton(i18n('MediaEditor.Fonts.Roboto'), 'roboto')}
      {fontButton(i18n('MediaEditor.Fonts.TimesNewRoman'), 'times')}
      {fontButton(i18n('MediaEditor.Fonts.SegoeUI'), 'segoe')}
    </>
  )
}
