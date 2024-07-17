import {createSignal, onMount, useContext} from 'solid-js'
import {ButtonIconTsx} from '../../buttonIconTsx'
import SwipeHandler from '../../swipeHandler'
import MediaEditorContext from '../context'

export default function RotationWheel(props: {}) {
  const context = useContext(MediaEditorContext)
  const [isCroping] = context.isCroping
  const [moved, setMoved] = createSignal(0)
  const [movedDiff, setMovedDiff] = createSignal(0)

  let swiperEl: HTMLDivElement

  onMount(() => {
    new SwipeHandler({
      element: swiperEl,
      onSwipe(xDiff) {
        setMovedDiff(xDiff)
      },
      onReset() {
        setMoved(moved() + movedDiff())
        setMovedDiff(0)
      }
    })
  })

  return (
    <div class="media-editor__rotation-wheel" style={{display: isCroping() ? undefined : 'none'}}>
      <ButtonIconTsx class="media-editor__rotation-wheel-button" icon='rotate' />
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
      <ButtonIconTsx class="media-editor__rotation-wheel-button" icon='flip' />
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
