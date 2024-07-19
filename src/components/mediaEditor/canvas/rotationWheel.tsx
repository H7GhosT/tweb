import {batch, createEffect, createSignal, getOwner, onMount, runWithOwner, useContext} from 'solid-js'
import {ButtonIconTsx} from '../../buttonIconTsx'
import SwipeHandler from '../../swipeHandler'
import MediaEditorContext from '../context'
import {getCropOffset} from './cropOffset'
import {withCurrentOwner} from '../utils'

const DEGREE_DIST_PX = 42
const DEGREE_STEP = 15

export default function RotationWheel(props: {}) {
  const context = useContext(MediaEditorContext)
  const [currentTab] = context.currentTab
  const isCroping = () => currentTab() === 'crop'
  const [rotation, setRotation] = context.rotation
  const [, setScale] = context.scale
  const [, setTranslation] = context.translation
  const [, setCurrentImageRatio] = context.currentImageRatio
  const [imageSize] = context.imageSize
  const [, setFlip] = context.flip
  const [moved, setMoved] = createSignal(0)
  const [movedDiff, setMovedDiff] = createSignal(0);

  // TODO: When resetting rotation from somewhere else the slider is not reset

  let swiperEl: HTMLDivElement

  onMount(() => {
    // let initialRotation = 0
    // let initialTranslation = [0, 0]

    new SwipeHandler({
      element: swiperEl,
      onStart() {
        // initialRotation = rotation()
        // initialTranslation = translation()
      },
      onSwipe(xDiff) {
        setMovedDiff(xDiff)
      },
      onReset() {
        setMoved(moved() + movedDiff())
        setMovedDiff(0)
      }
    })
  })

  let prevRotation = 0

  createEffect(() => {
    const rotationFromSiper = (moved() + movedDiff()) / DEGREE_DIST_PX * DEGREE_STEP * Math.PI / 180
    const rotationDiff = rotationFromSiper - prevRotation
    setRotation(prev => {
      return prev - rotationDiff
    })
    const r = [Math.cos(rotationDiff), Math.sin(rotationDiff)]

    setTranslation(translation => [
      translation[0] * r[0] + translation[1] * r[1],
      translation[1] * r[0] - translation[0] * r[1]
    ])
    prevRotation = rotationFromSiper
  })

  function rotateLeft() {
    const cropOffset = getCropOffset()
    batch(() => {
      const newRotation = Math.round(rotation() / Math.PI * 2) * Math.PI / 2 - Math.PI / 2
      setRotation(newRotation)
      setTranslation([0, 0])
      const [w, h] = imageSize()

      const imageRatio = w / h
      let width = cropOffset.width, height = cropOffset.height

      if(cropOffset.width / imageRatio > cropOffset.height) width = cropOffset.height * imageRatio
      else height = cropOffset.width / imageRatio


      const isReversedScale = Math.abs(Math.round(newRotation / Math.PI * 2)) & 1

      const scale = cropOffset.height / width

      setCurrentImageRatio(isReversedScale ? 1 / imageRatio : imageRatio)
      setScale(isReversedScale ? scale : 1)

      setMoved(0)
      setMovedDiff(0)
      prevRotation = 0
    })
  }

  function flipImage() {
    setFlip(flip => [flip[0] * -1, flip[1]])
  }

  return (
    <div class="media-editor__rotation-wheel" style={{display: isCroping() ? undefined : 'none'}}>
      <ButtonIconTsx onClick={withCurrentOwner(rotateLeft)} class="media-editor__rotation-wheel-button" icon='rotate' />
      <div class="media-editor__rotation-wheel-swiper-wrapper">
        <div ref={swiperEl} style={{['--moved']: moved() + movedDiff() + 'px'}} class="media-editor__rotation-wheel-swiper">
          <div class="media-editor__rotation-wheel-labels">
            {new Array(13).fill(null).map((_, i) => (
              <div class="media-editor__rotation-wheel-label">
                <div class="media-editor__rotation-wheel-label-text">
                  {i * 15 - 90}
                </div>
              </div>
            ))}
          </div>
          <div class="media-editor__rotation-wheel-dots">
            {new Array(97).fill(null).map(() => (
              <div class="media-editor__rotation-wheel-dot" />
            ))}
          </div>
        </div>
        <ArrowUp />
      </div>
      <ButtonIconTsx onClick={flipImage} class="media-editor__rotation-wheel-button" icon='flip_image_horizontal' />
    </div>
  )
}

function ArrowUp() {
  return (
    <svg class="media-editor__rotation-wheel-arrow" width="6" height="4" viewBox="0 0 6 4" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.29289 0.707106L0.28033 2.71967C-0.192143 3.19214 0.142482 4 0.81066 4H5.18934C5.85752 4 6.19214 3.19214 5.71967 2.71967L3.70711 0.707107C3.31658 0.316583 2.68342 0.316582 2.29289 0.707106Z" fill="white"/>
    </svg>
  )
}
