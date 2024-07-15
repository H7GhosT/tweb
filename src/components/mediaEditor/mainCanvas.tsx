import {createSignal, onMount, Show, useContext} from 'solid-js'
import MediaEditorContext from './context'
import {initShaderProgram} from './webgl/initShaderProgram'
import {loadTexture} from './webgl/loadTexture'
import {i18n} from '../../lib/langPack'

const adjustments = [
  {uniform: 'uEnhance', label: () => i18n('MediaEditor.Adjustments.Enhance')},
  {uniform: 'uBrightness', label: () => i18n('MediaEditor.Adjustments.Brightness')},
  {uniform: 'uContrast', label: () => i18n('MediaEditor.Adjustments.Contrast')},
  {uniform: 'uSaturation', label: () => i18n('MediaEditor.Adjustments.Saturation')},
  {uniform: 'uWarmth', label: () => i18n('MediaEditor.Adjustments.Warmth')},
  {uniform: 'uFade', label: () => i18n('MediaEditor.Adjustments.Fade')},
  {uniform: 'uHighlights', label: () => i18n('MediaEditor.Adjustments.Highlights')},
  {uniform: 'uShadows', label: () => i18n('MediaEditor.Adjustments.Shadows')},
  {uniform: 'uVignette', label: () => i18n('MediaEditor.Adjustments.Vignette')},
  {uniform: 'uGrain', label: () => i18n('MediaEditor.Adjustments.Grain')},
  {uniform: 'uSharpen', label: () => i18n('MediaEditor.Adjustments.Sharpen')}
]

// function createPayload(program: WebGLProgram, buffers: ) {
//   return {
//     program,
//     buffers,
//     texture,
//     attribs: {
//       vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
//       vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
//       textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
//     },
//     uniforms: {
//       uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
//       uAngle: gl.getUniformLocation(shaderProgram, 'uAngle'),
//       uResolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
//       uTranslation: gl.getUniformLocation(shaderProgram, 'uTranslation'),
//       uScale: gl.getUniformLocation(shaderProgram, 'uScale'),
//       uImageSize: gl.getUniformLocation(shaderProgram, 'uImageSize'),
//       ...Object.fromEntries(adjustments.map(({uniform}) => [uniform, gl.getUniformLocation(shaderProgram, uniform)]))
//   }
// }

function ImageCanvas() {
  let canvas: HTMLCanvasElement
  const context = useContext(MediaEditorContext)
  const [canvasResolution] = context.canvasResolutionSignal

  onMount(async() => {
    const gl = canvas.getContext('webgl')
    const [
      {vertexShaderSource, fragmentShaderSource},
      texture
    ] = await Promise.all([
      import('./webgl/shaderSources'),
      loadTexture(gl, 'texture.jpg')
    ])

    const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource)
    const buffers = {
      position: initPositionBuffer(gl, 0, 0),
      texture: initTextureBuffer(gl)
    }

    const payload = {
      program: shaderProgram,
      buffers,
      texture,
      attribs: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
      },
      uniforms: {
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        uAngle: gl.getUniformLocation(shaderProgram, 'uAngle'),
        uResolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
        uTranslation: gl.getUniformLocation(shaderProgram, 'uTranslation'),
        uScale: gl.getUniformLocation(shaderProgram, 'uScale'),
        uImageSize: gl.getUniformLocation(shaderProgram, 'uImageSize'),
        ...Object.fromEntries(adjustments.map(({uniform}) => [uniform, gl.getUniformLocation(shaderProgram, uniform)]))
      }
    };
    export type MyTYpe = typeof payload
  })

  return (
    <canvas
      ref={canvas}
      width={canvasResolution()[0] * context.pixelRatio}
      height={canvasResolution()[1] * context.pixelRatio}
    />
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
        <MainCanvas />
      </Show>
    </div>
  )
}
