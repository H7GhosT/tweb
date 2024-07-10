import {createMemo} from 'solid-js'

import clamp from '../../helpers/number/clamp'

function nMap(value: number, min: number, max: number, tMin: number, tMax: number) {
  return (value - min) / (max - min) * (tMax - tMin) + tMin
}

export default function MediaEditorRangeInput(props: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  passiveLabel?: boolean
}) {
  const normalizedValue = () => nMap(props.value, props.min, props.max, 0, 1)
  const mappedCenter = createMemo(() => nMap(0, props.min, props.max, 0, 100))

  return (
    <div
      class="media-editor__range-input"
      classList={{
        'media-editor__range-input--passive': props.passiveLabel,
        'media-editor__range-input--has-value': !props.passiveLabel && !!props.value
      }}
      style={{
        '--normalized': normalizedValue(),
        '--bar-left': props.value > 0 ? mappedCenter() + '%' : undefined,
        '--bar-right': props.value < 0 ? mappedCenter() + '%' : undefined,
        '--bar-w': Math.abs(props.value / (props.max - props.min)) * 100 + '%'
      }}
    >
      <div class="media-editor__range-input-row">
        <div class="media-editor__range-input-label">
          {props.label}
        </div>
        <div class="media-editor__range-input-value">
          {props.value}
        </div>
      </div>
      <div class="media-editor__range-input-wrapper">
        <input
          type="range"
          min={props.min}
          max={props.max}
          step="1"
          value={props.value}
          onInput={e => {
            props.onChange(clamp(e.currentTarget.valueAsNumber, props.min, props.max))
          }}
        />
        <div class="media-editor__range-input-thumb" />
        <div class="media-editor__range-input-progress" />
      </div>
    </div>
  )
}
