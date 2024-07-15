import {createEffect, createSignal, onMount, Show, useContext} from 'solid-js'
import MediaEditorContext from './context'
import {initWebGL, RenderingPayload} from './webgl/initWebGL'
import {draw} from './webgl/draw'
import {AdjustmentsConfig} from './adjustments'


function ImageCanvas() {
  const context = useContext(MediaEditorContext)
  const [canvasResolution] = context.canvasResolutionSignal

  const canvas = (
    <canvas
      width={canvasResolution()[0] * context.pixelRatio}
      height={canvasResolution()[1] * context.pixelRatio}
    />) as HTMLCanvasElement
  const gl = canvas.getContext('webgl')

  const [renderingPayload, setRenderingPayload] = createSignal<RenderingPayload>()

  onMount(async() => {
    setRenderingPayload(await initWebGL(gl, context))
  })

  createEffect(() => {
    const payload = renderingPayload()
    if(!payload) return

    draw(gl, payload, {
      rotation: 0,
      scale: Math.min(gl.canvas.width / payload.image.width, gl.canvas.height / payload.image.height),
      translation: [0, 0],
      imageSize: [payload.image.width, payload.image.height],
      ...(
        Object.fromEntries(
          context.adjustments.map(({key, signal, to100}) => {
            const value = signal[0]()
            return [key, value / (to100 ? 100 : 50)]
          })
        ) as Record<AdjustmentsConfig[number]['key'], number>
      )
    })
  })

  return (
    <>{canvas}</>
  )
}

export default function MainCanvas(props: {}) {
  let container: HTMLDivElement
  const context = useContext(MediaEditorContext)
  const [canvasResolution, setCanvasResolution] = context.canvasResolutionSignal

  onMount(() => {
    const bcr = container.getBoundingClientRect()
    setCanvasResolution([bcr.width, bcr.height])
  })


  return (
    <div ref={container} class="media-editor__main-canvas">
      <Show when={canvasResolution()}>
        <ImageCanvas />
      </Show>
    </div>
  )
}
