import {createEffect, createSignal, onMount, Show, useContext} from 'solid-js'

import SwipeHandler from '../../swipeHandler'
import MediaEditorContext from '../context'
import {getCropOffset} from './cropOffset'


export default function CropHandles() {
  const context = useContext(MediaEditorContext)
  const [canvasResolution] = context.canvasResolution
  const [currentTab] = context.currentTab
  const isCroping = () => currentTab() === 'crop'
  const [currentImageRatio, setCurrentImageRatio] = context.currentImageRatio
  const [scale, setScale] = context.scale
  const [translation, setTranslation] = context.translation
  const [fixedImageRatioKey] = context.fixedImageRatioKey
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

  let cropAreaEl: HTMLDivElement
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
          if(fixedImageRatioKey()) {
            let ratio = currentImageRatio()
            if(left !== top) {
              ratio = -ratio
            }
            const x = xDiff
            xDiff = (xDiff + yDiff * ratio) / 2
            yDiff = (x / ratio + yDiff) / 2
          }
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

    let initialTranslation: [number, number] = [0, 0]

    new SwipeHandler({
      element: cropAreaEl,
      onStart() {
        initialTranslation = translation()
      },
      onSwipe(xDiff, yDiff) {
        setTranslation([initialTranslation[0] + xDiff, initialTranslation[1] + yDiff])
      }
    })
  })

  const left = () => leftTop()[0] + leftTopDiff()[0]
  const top = () => leftTop()[1] + leftTopDiff()[1]
  const width = () => size()[0] + diff()[0]
  const height = () => size()[1] + diff()[1]
  const right = () => left() + width()
  const bottom = () => top() + height()

  const croppedSizeFull = () => {
    const [cw, ch] = canvasResolution()
    let [w, h] = [cw, ch]
    const ratio = currentImageRatio()

    if(w / ratio > h) w = h * ratio
    else h = w / ratio

    return [(cw - w) / 2, (ch - h) / 2]
  }


  return (
    <>
      <Show when={!isCroping()}>
        <div style={{background: 'black', position: 'absolute', left: '0px', top: '0px', width: '100%', height: croppedSizeFull()[1] + 'px'}}></div>
        <div style={{background: 'black', position: 'absolute', left: '0px', bottom: '0px', width: '100%', height: croppedSizeFull()[1] + 'px'}}></div>
        <div style={{background: 'black', position: 'absolute', left: '0px', top: '0px', height: '100%', width: croppedSizeFull()[0] + 'px'}}></div>
        <div style={{background: 'black', position: 'absolute', right: '0px', top: '0px', height: '100%', width: croppedSizeFull()[0] + 'px'}}></div>
      </Show>
      <div
        style={{
          position: isCroping() ? 'absolute' : 'static',
          left: left() + 'px',
          top: top() + 'px',
          width: width() + 'px',
          height: height() + 'px'
        }}
      >
        <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '6px', height: '6px', background: 'rgba(255, 0, 0, .4)'}} />
      </div>
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
        ref={cropAreaEl}
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
