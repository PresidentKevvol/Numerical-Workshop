// use ajax request to load fragment shader
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${url}`);
    }
    return await response.text();
}

AFRAME.registerComponent('volumetric-orbital', {
    init: async function () {
      const material = new THREE.ShaderMaterial({
        vertexShader: await loadShader('vert.glsl'),
        fragmentShader: await loadShader('frag.glsl'),
        transparent: true,
        side: THREE.FrontSide // Render only the front faces of the box
      });
  
      // Apply the custom shader to the A-Frame entity's mesh
      this.el.getObject3D('mesh').material = material;
    }
});

AFRAME.registerShader('volumetric', {
    schema: {
      color: {type: 'color', is: 'uniform', default: 'red'},
      opacity: {type: 'number', is: 'uniform', default: 1.0}
    },
    vertexShader: `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
    `,
    fragmentShader: `
uniform mat4 modelMatrix;
varying vec3 vWorldPosition;

void main() {
    vec3 worldRayDir = normalize(vWorldPosition - cameraPosition);
    
    // Transform ray origin and direction into the box's local space
    mat4 inverseModel = inverse(modelMatrix);
    vec3 local_ro = (inverseModel * vec4(cameraPosition, 1.0)).xyz;
    vec3 local_rd = normalize((inverseModel * vec4(worldRayDir, 0.0)).xyz);

    gl_FragColor = vec4(local_rd, 1.0);
}    
    `
});