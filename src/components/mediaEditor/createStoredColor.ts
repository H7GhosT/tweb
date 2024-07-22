import {createSignal} from 'solid-js';

import {colorPickerSwatches} from './mediaEditorColorPicker';

export function createStoredColor(key: string, defaultColor: string) {
  // (1 - use swatch, 2 - use picker color), (color from swatch), (color from picker)
  type SavedColorInfo = [1 | 2, string, string]

  const [savedColor, setSavedColor] = createSignal<SavedColorInfo>((() => {
    const fallback = () => {
      const value = [colorPickerSwatches.includes(defaultColor) ? 1 : 2, defaultColor, defaultColor] as SavedColorInfo
      localStorage.setItem(key, JSON.stringify(value))
      return value
    }
    try {
      const meta: SavedColorInfo = JSON.parse(localStorage.getItem(key))
      if(!(meta instanceof Array) || typeof meta[0] !== 'number' || typeof meta[1] !== 'string' || typeof meta[2] !== 'string') {
        return fallback()
      }
      return meta
    } catch{}
    return fallback()
  })())

  function setColor(color: string) {
    let value: SavedColorInfo
    if(colorPickerSwatches.includes(color)) {
      value = [1, color, color]
    } else {
      value = [2, savedColor()[1], color]
    }
    setSavedColor(value)
    localStorage.setItem(key, JSON.stringify(value))
  }

  return [
    () => ({
      value: savedColor()[savedColor()[0]],
      previous: savedColor()[1]
    }),
    setColor
  ] as const
}
