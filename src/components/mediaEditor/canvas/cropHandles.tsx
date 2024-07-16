import {createEffect, createSignal, onMount, Show, useContext} from 'solid-js'

import SwipeHandler from '../../swipeHandler'
import MediaEditorContext from '../context'
import {getCropOffset} from './cropOffset'


export default function CropHandles() {
  const context = useContext(MediaEditorContext)
  const [canvasResolution] = context.canvasResolution
  const [isCroping] = context.isCroping
  const [currentImageRatio, setCurrentImageRatio] = context.currentImageRatio
  const [scale, setScale] = context.scale
  const [translation, setTranslation] = context.translation
  const cropOffset = getCropOffset()

  const [leftTop, setLeftTop] = createSignal([0, 0])
  const [leftTopDiff, setLeftTopDiff] = createSignal([0, 0])
  const [size, setSize] = createSignal([0, 0])
  const [diff, setDiff] = createSignal([0, 0])

  const resetSize = () => {
    const imageRatio = currentImageRatio()
    let width = cropOffset.width, height = cropOffset.height

    if(cropOffset.width / imageRatio > cropOffset.height) width = cropOffset.height * imageRatio
    else height = cropOffset.width / imageRatio

    setLeftTop([
      cropOffset.left + (cropOffset.width - width) / 2,
      cropOffset.top + (cropOffset.height - height) / 2
    ])
    setSize([width, height])
  }

  createEffect(() => {
    resetSize()
  })

  const circleOffset = '-5px'

  let leftTopEl: HTMLDivElement
  let rightTopEl: HTMLDivElement
  let leftBottomEl: HTMLDivElement
  let rightBottomEl: HTMLDivElement

  onMount(() => {
    const multipliers = [
      {el: leftTopEl, left: 1, top: 1},
      {el: rightTopEl, left: 0, top: 1},
      {el: leftBottomEl, left: 1, top: 0},
      {el: rightBottomEl, left: 0, top: 0}
    ]

    multipliers.forEach(({el, left, top}) => {
      new SwipeHandler({
        element: el,
        onSwipe(xDiff, yDiff) {
          setDiff([xDiff * (left ? -1 : 1), yDiff * (top ? -1 : 1)])
          setLeftTopDiff([xDiff * left, yDiff * top])
        },
        onStart() {
          el.classList.add('media-editor__crop-handles-circle--anti-flicker')
        },
        onReset() {
          const newWidth = size()[0] + diff()[0], newHeight = size()[1] + diff()[1];
          const newRatio = newWidth / newHeight

          const upScale = Math.min(
            cropOffset.width / newWidth,
            cropOffset.height / newHeight
          )
          const newScale = scale() * upScale
          setScale(newScale)

          setCurrentImageRatio(newRatio)

          setTranslation(translation => [
            upScale * (translation[0] + (-diff()[0] * (left ? -1 : 1)) * 0.5),
            upScale * (translation[1] + (-diff()[1] * (top ? -1 : 1)) * 0.5)
          ])

          resetSize()
          setDiff([0, 0])
          setLeftTopDiff([0, 0])

          el.classList.remove('media-editor__crop-handles-circle--anti-flicker')
        }
      })
    })
  })

  const left = () => leftTop()[0] + leftTopDiff()[0]
  const top = () => leftTop()[1] + leftTopDiff()[1]
  const width = () => size()[0] + diff()[0]
  const height = () => size()[1] + diff()[1]
  const right = () => left() + width()
  const bottom = () => top() + height()

  return (
    <>
      <div
        class="media-editor__crop-handles-backdrop"
        style={{
          display: isCroping() ? undefined : 'none',
          ['clip-path']: `polygon(
            0 0, 0 100%,
            ${left()}px 100%, ${left()}px ${top()}px, ${right()}px ${top()}px,
            ${right()}px ${bottom()}px, ${left()}px ${bottom()}px, ${left()}px 100%,
            100% 100%, 100% 0%
          )`
        }}
      />
      <div
        class="media-editor__crop-handles"
        style={{
          display: isCroping() ? undefined : 'none',
          left: left() + 'px',
          top: top() + 'px',
          width: width() + 'px',
          height: height() + 'px'
        }}
      >
        <div class="media-editor__crop-handles-line-h" style={{top: '33%'}} />
        <div class="media-editor__crop-handles-line-h" style={{top: '66%'}} />
        <div class="media-editor__crop-handles-line-v" style={{left: '33%'}} />
        <div class="media-editor__crop-handles-line-v" style={{left: '66%'}} />

        <div ref={leftTopEl} class="media-editor__crop-handles-circle" style={{left: circleOffset, top: circleOffset}} />
        <div ref={rightTopEl} class="media-editor__crop-handles-circle" style={{right: circleOffset, top: circleOffset}} />
        <div ref={leftBottomEl} class="media-editor__crop-handles-circle" style={{left: circleOffset, bottom: circleOffset}} />
        <div ref={rightBottomEl} class="media-editor__crop-handles-circle" style={{right: circleOffset, bottom: circleOffset}} />
      </div>
    </>
  )
}
