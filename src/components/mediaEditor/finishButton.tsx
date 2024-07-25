import {onMount, useContext} from 'solid-js'

import ripple from '../ripple'

import MediaEditorContext from './context'

export default function FinishButton(props: {
  onClick: () => void
}) {
  const context = useContext(MediaEditorContext)
  const [history] = context.history
  const [rotation] = context.rotation
  const [translation] = context.translation
  const [flip] = context.flip
  const [scale] = context.scale
  const [currentImageRatio] = context.currentImageRatio
  const [imageSize] = context.imageSize

  let container: HTMLDivElement

  onMount(() => {
    ripple(container)
  })

  const canFinish = () => {
    const initialRatio = imageSize()[0] / imageSize()[1]

    return (
      Math.abs(initialRatio - currentImageRatio()) < 0.0001 ||
      rotation() !== 0 ||
      flip()[0] !== 1 ||
      flip()[1] !== 1 ||
      scale() !== 1 ||
      translation()[0] !== 0 ||
      translation()[1] !== 0 ||
      history().length > 0
    )
  }

  return (
    <div
      ref={container}
      onClick={props.onClick}
      class="media-editor__finish-button"
      classList={{
        'media-editor__finish-button--hidden': !canFinish()
      }}
    >
      <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 9L6.5 14L16 2" stroke="white" stroke-width="2.66" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  )
}

