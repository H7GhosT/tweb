
export const vsSource = `
precision mediump float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform float uAngle;
uniform float uScale;
uniform vec2 uImageSize;
uniform vec2 uResolution;
uniform vec2 uTranslation;

varying highp vec2 vTextureCoord;

void main(void) {
  vec2 position = aVertexPosition;
  // Center to 0,0
  position = position - uImageSize / 2.0;
  // Scale
  position *= uResolution.y / uImageSize.y;
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

// Fragment shader program

export const fsSource = `
precision mediump float;

varying highp vec2 vTextureCoord;


uniform sampler2D uSampler;

uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uWarmth;
uniform float uFade;
uniform float uShadows;
uniform float uHighlights;
uniform float uVignette;

vec4 saturation(vec4 color, float value) {
  // https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
  const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
  vec3 grayscale = vec3(dot(color.rgb, luminosityFactor));

  return vec4(mix(grayscale, color.rgb, 1.0 + value), color.a);
}

vec4 brightness(vec4 color, float value) {
  return vec4(color.rgb + value, color.a);
}

vec4 contrast(vec4 color, float value) {
  return vec4(0.5 + (1.0 + value) * (color.rgb - 0.5), color.a);
}

vec4 exposure(vec4 color, float value) {
  return vec4((1.0 + value) * color.rgb, color.a);
}

vec3 orange = vec3(1, 0.4235294117647059, 0);
vec3 blue = vec3(0.7098039215686275, 0.803921568627451, 1);

vec4 warmth(vec4 color, float value) {
  value *= .075;
  return vec4(mix(color.rgb, orange, value), color.a);
}

vec4 fade(vec4 color, float value) {
  value *= .25;
  return vec4(mix(color.rgb, vec3(1.), value), color.a);
}


vec4 shadows(vec4 color, float value) {
  value *= .25;
  const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
  float luminosity = dot(color.rgb, luminosityFactor);
  return vec4(color.rgb + value * pow(1. - luminosity, 5.), color.a);
}


vec4 highlights(vec4 color, float value) {
  value *= .25;
  const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
  float luminosity = dot(color.rgb, luminosityFactor);
  return vec4(color.rgb + value * pow(luminosity, 3.), color.a);
}

// https://www.shadertoy.com/view/lsKSWR
vec4 vignette(vec4 color, vec2 coord, float value) {
  value *= .15;
  coord *= 1. - coord.yx;
  float vig = coord.x*coord.y * 15.0;
  vig = pow(vig, value);
  vig = 1.0 - vig;
  return vec4(color.rgb - vig, color.a);
}


void main(void) {
  vec4 color = texture2D(uSampler, vTextureCoord);

  color = saturation(color, uSaturation);
  color = contrast(color, uContrast);
  // color = exposure(color, uExposure);
  color = fade(color, uFade);
  color = brightness(color, uBrightness);
  color = warmth(color, uWarmth);
  color = shadows(color, uShadows);
  color = highlights(color, uHighlights);
  color = vignette(color, vTextureCoord.xy, uVignette);

  gl_FragColor = color;
}
`;
