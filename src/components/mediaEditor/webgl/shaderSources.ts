export const vertexShaderSource = `
precision highp float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform float uAngle;
uniform float uScale;
uniform vec2 uFlip;
uniform vec2 uImageSize;
uniform vec2 uResolution;
uniform vec2 uTranslation;

varying highp vec2 vTextureCoord;

void main(void) {
  vec2 position = aVertexPosition;
  // Center to 0,0
  position = position - uImageSize / 2.0;
  // Flip
  position = position * uFlip;
  // Scale
  position *= uScale;

  // Rotate
  vec2 rotation = vec2(sin(uAngle), cos(uAngle));
  position = vec2(
    position.x * rotation.y + position.y * rotation.x,
    position.y * rotation.y - position.x * rotation.x
  );

  // Go to canvas center
  position += uResolution / 2.0;

  // Translate and normalize
  position = ((position + uTranslation) / uResolution) * 2.0 - 1.0;  

  gl_Position = vec4(position * vec2(1, -1), 0.0, 1.0);
  vTextureCoord = aTextureCoord;
}
`;

export const fragmentShaderSource = `
precision highp float;

varying highp vec2 vTextureCoord;


uniform sampler2D uSampler;

uniform vec2 uResolution;

uniform float uEnhance;
uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uWarmth;
uniform float uFade;
uniform float uShadows;
uniform float uHighlights;
uniform float uVignette;
uniform float uGrain;
uniform float uSharpen;

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
float colorLuminosity(vec3 color) {
  return dot(color, luminosityFactor);
}

vec4 saturation(vec4 color, float value) {
  vec3 grayscale = vec3(colorLuminosity(color.rgb));
  return vec4(mix(grayscale, color.rgb, 1.0 + value), color.a);
}

vec4 brightness(vec4 color, float value) {
  value *= .3;
  return vec4(color.rgb + value, color.a);
}

vec4 contrast(vec4 color, float value) {
  value *= .25;
  return vec4(0.5 + (1.0 + value) * (color.rgb - 0.5), color.a);
}

const vec3 warm = vec3(1, 0.4235294117647059, 0.);
// vec3 cold = vec3(0.7098039215686275, 0.803921568627451, 1.);

vec4 warmth(vec4 color, float value) {
  value *= .075;
  return vec4(mix(color.rgb, warm, value), color.a);
}

vec4 fade(vec4 color, float value) {
  value *= .25;
  return vec4(mix(color.rgb, vec3(1.), value), color.a);
}


vec4 shadows(vec4 color, float value) {
  value *= .25;
  const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
  float luminosity = colorLuminosity(color.rgb);
  return vec4(color.rgb + value * pow(1. - luminosity, 5.), color.a);
}


vec4 highlights(vec4 color, float value) {
  value *= .25;
  const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
  float luminosity = colorLuminosity(color.rgb);
  return vec4(color.rgb + value * pow(luminosity, 3.), color.a);
}

// https://www.shadertoy.com/view/lsKSWR
vec4 vignette(vec4 color, float value) {
  vec2 coord = vTextureCoord.xy;
  value *= .15;
  coord *= 1. - coord.yx;
  float vig = coord.x*coord.y * 15.0;
  vig = pow(vig, value);
  vig = 1.0 - vig;
  return vec4(color.rgb - vig, color.a);
}

// https://www.shadertoy.com/view/3sGGRz
vec4 grain(vec4 color, float value) {
  vec2 coord = vTextureCoord.xy;

  float noise = (fract(sin(dot(coord, vec2(12.9898,78.233)*2.0)) * 43758.5453));

  vec3 res = color.rgb + (color.rgb * noise * value * .2);

  return vec4(res, color.a);
}

// https://www.shadertoy.com/view/lslGRr
vec4 sharpen(float value) {
  vec2 coord = vTextureCoord.xy;

  vec2 step = 1.0 / uResolution.xy;

  vec3 texA = texture2D( uSampler, coord + vec2(-step.x, -step.y) * 1.5 ).rgb;
  vec3 texB = texture2D( uSampler, coord + vec2( step.x, -step.y) * 1.5 ).rgb;
  vec3 texC = texture2D( uSampler, coord + vec2(-step.x,  step.y) * 1.5 ).rgb;
  vec3 texD = texture2D( uSampler, coord + vec2( step.x,  step.y) * 1.5 ).rgb;

  vec3 around = 0.25 * (texA + texB + texC + texD);
  vec4 center = texture2D(uSampler, coord);

  return vec4(center.rgb + (center.rgb - around) * value, center.a);
}

void main(void) {
  vec4 color = texture2D(uSampler, vTextureCoord);

  color = sharpen(uSharpen + uEnhance * .35);
  color = grain(color, uGrain);
  color = saturation(color, uSaturation + uEnhance * .1);
  color = warmth(color, uWarmth);
  color = fade(color, uFade);
  
  color = shadows(color, uShadows - uEnhance * .1);
  color = highlights(color, uHighlights + uEnhance * .2);
  color = contrast(color, uContrast + uEnhance * .25);

  color = brightness(color, uBrightness + uEnhance * .3);
  color = vignette(color, uVignette);

  gl_FragColor = color;
}
`;
