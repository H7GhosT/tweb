import {createEffect, createSignal, onMount} from 'solid-js';

import {hexToRgb} from '../../helpers/color';
import ColorPicker from '../colorPicker';
import ripple from '../ripple';
import {delay} from './utils';

const colors = [
  '#FFFFFF',
  '#FE4438',
  '#FF8901',
  '#FFD60A',
  '#33C759',
  '#62E5E0',
  '#0A84FF',
  '#BD5CF3'
].map(color => color.toLowerCase())

export default function MediaEditorColorPicker(props: {
  value: string
  onChange: (value: string) => void
}) {
  const [collapsed, setCollapsed] = createSignal(true);

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
    const willCollapse = !collapsed()
    setCollapsed(prev => !prev)
    if(willCollapse) {
      await delay(200)
      props.onChange(colors[0])
    }
  }

  const colorPicker = new ColorPicker({
    buildLayout: (parts) => {
      return (
        <div
          class="media-editor__color-picker"
          classList={{'media-editor__color-picker--collapsed': collapsed()}}
          style={{'--picker-height': '120px'}}
        >
          <div class="media-editor__color-picker-swatches">
            {colors.map(swatch)}
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
    pickerBoxWidth: 200,
    pickerBoxHeight: 120,
    sliderWidth: 304,
    thickSlider: true
  })

  createEffect(() => {
    colorPicker.setColor(props.value)
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
