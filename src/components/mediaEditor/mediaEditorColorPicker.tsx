import {createEffect, createReaction, createSignal, on, onMount} from 'solid-js';

import {hexToRgb} from '../../helpers/color';
import ColorPicker from '../colorPicker';
import ripple from '../ripple';
import {delay} from './utils';

export const colorPickerSwatches = [
  '#ffffff',
  '#fe4438',
  '#ff8901',
  '#ffd60a',
  '#33c759',
  '#62e5e0',
  '#0a84ff',
  '#bd5cf3'
]

const PICKER_WIDTH_PX = 200
const PICKER_HEIGHT_PX = 120
const SLIDER_WIDTH_PX = 304

export default function MediaEditorColorPicker(props: {
  value: string
  onChange: (value: string) => void
  colorKey?: string // Just for reaction, not used to access anything
  previousColor?: string
}) {
  const [collapsed, setCollapsed] = createSignal(colorPickerSwatches.includes(props.value));
  const [collapsing, setCollapsing] = createSignal(false);

  const swatch = (hexColor: string, i: number) =>
    <div
      class='media-editor__color-picker-swatch'
      classList={{'media-editor__color-picker-swatch--active': props.value === hexColor && collapsed()}}
      style={{
        '--color-rgb': hexToRgb(hexColor).join(' '),
        '--i': i
      }}
      onClick={() => props.onChange(hexColor)}
    >
      <div class='media-editor__color-picker-swatch-color' />
    </div>

  const onCollapseToggle = async() => {
    setCollapsed(prev => !prev)
    if(collapsed()) {
      setCollapsing(true)
      props.onChange(props.previousColor || colorPickerSwatches[0])
      await delay(200)
      setCollapsing(false)
    }
  }

  const colorPicker = new ColorPicker({
    buildLayout: (parts) => {
      return (
        <div
          class="media-editor__color-picker"
          classList={{'media-editor__color-picker--collapsed': collapsed()}}
          style={{'--picker-height': PICKER_HEIGHT_PX + 'px'}}
        >
          <div class="media-editor__color-picker-swatches">
            {colorPickerSwatches.map(swatch)}
            <div
              class='media-editor__color-picker-swatch media-editor__color-picker-swatch--gradient'
              classList={{'media-editor__color-picker-swatch--active': !collapsed()}}
              onClick={onCollapseToggle}
            >
              <div class='media-editor__color-picker-swatch-color' />
            </div>

            <div class="media-editor__color-picker-slider">
              {parts.slider}
            </div>
          </div>

          <div class="media-editor__color-picker-layout-wrapper">
            <div class="media-editor__color-picker-layout">
              <div class="media-editor__color-picker-box">
                {parts.pickerBox}
              </div>
              <div class="media-editor__color-picker-inputs">
                {parts.hexInput}
                {parts.rgbInput}
              </div>
            </div>
          </div>
        </div>
      ) as HTMLDivElement
    },
    pickerBoxWidth: PICKER_WIDTH_PX,
    pickerBoxHeight: PICKER_HEIGHT_PX,
    sliderWidth: SLIDER_WIDTH_PX,
    thickSlider: true
  })

  createEffect(on(() => props.colorKey, () => {
    const newCollapsed = colorPickerSwatches.includes(props.value)
    if(newCollapsed !== collapsed()) setCollapsed(newCollapsed)
  }))

  createEffect(() => {
    if(!collapsing()) {
      colorPicker.setColor(props.value)
    } else {
      const track = createReaction(() => colorPicker.setColor(props.value))
      track(collapsing)
    }
  })

  onMount(() => {
    colorPicker.onChange = (color) => {
      if(color.hex !== props.value) props.onChange(color.hex)
    }
    colorPicker.container.querySelectorAll('.media-editor__color-picker-swatch').forEach(element => {
      ripple(element as HTMLElement)
    })
  })

  return (
    <>
      {colorPicker.container}
    </>
  )
}
