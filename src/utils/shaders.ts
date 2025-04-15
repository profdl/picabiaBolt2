export const createShaderProgram = (gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string) => {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  if (!vertexShader) throw new Error('Could not create vertex shader');
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error('Vertex shader compilation error: ' + gl.getShaderInfoLog(vertexShader));
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragmentShader) throw new Error('Could not create fragment shader');
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error('Fragment shader compilation error: ' + gl.getShaderInfoLog(fragmentShader));
  }

  const program = gl.createProgram();
  if (!program) throw new Error('Could not create shader program');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Shader program linking error: ' + gl.getProgramInfoLog(program));
  }

  return program;
};

export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShaderSource = `
  precision mediump float;
  
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_brightness;
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Apply brightness
    color.rgb *= u_brightness;
    
    // Apply contrast
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    
    // Apply saturation
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, u_saturation);
    
    gl_FragColor = color;
  }
`;

export const createTexture = (gl: WebGLRenderingContext, image: HTMLImageElement | HTMLCanvasElement) => {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create texture');
  
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  return texture;
};

export const createBuffer = (gl: WebGLRenderingContext, data: Float32Array) => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Could not create buffer');
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  
  return buffer;
}; 