import {batch, useContext} from 'solid-js';

import MediaEditorContext from '../context';
import {getCropOffset} from '../canvas/cropOffset';
import {snapToViewport} from '../math/viewports';


export function applyCurrentFixedRatio() {
  const context = useContext(MediaEditorContext)
  const [, setTranslation] = context.translation
  const [, setScale] = context.scale
  const [rotation, setRotation] = context.rotation
  const [, setCurrentImageRatio] = context.currentImageRatio
  const [fixedImageRatioKey] = context.fixedImageRatioKey
  const [imageSize] = context.imageSize
  const cropOffset = getCropOffset()

  const [w, h] = imageSize()

  const snappedRotation90 = Math.round(rotation() / Math.PI * 2)
  const isReversedRatio = Math.abs(snappedRotation90) & 1
  const snappedRotation = snappedRotation90 * Math.PI / 2


  let ratio: number
  if(fixedImageRatioKey()?.includes('x')) {
    const parts = fixedImageRatioKey().split('x')
    ratio = parseInt(parts[0]) / parseInt(parts[1])
  } else {
    ratio = isReversedRatio ? h / w : w / h
  }

  const originalRatio = w / h

  const [w1, h1] = snapToViewport(originalRatio, cropOffset.width, cropOffset.height)
  const [w2, h2] = snapToViewport(ratio, cropOffset.width, cropOffset.height)

  batch(() => {
    if(isReversedRatio) {
      setScale(Math.max(w2 / h1, h2 / w1))
    } else {
      setScale(Math.max(w2 / w1, h2 / h1))
    }
    setCurrentImageRatio(ratio)
    setTranslation([0, 0])
    setRotation(snappedRotation)
  })
}
