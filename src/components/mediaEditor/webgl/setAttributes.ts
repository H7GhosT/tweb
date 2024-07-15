function setPositionAttribute(gl: WebGLRenderingContext, positionBuffer: WebGLBuffer, vertexPositionAttrib: GLuint) {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(vertexPositionAttrib, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexPositionAttrib);
}

function setTextureAttribute(gl: WebGLRenderingContext, textureBuffer: WebGLBuffer, textureCoordAttrib: GLuint) {
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.vertexAttribPointer(textureCoordAttrib, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(textureCoordAttrib);
}
