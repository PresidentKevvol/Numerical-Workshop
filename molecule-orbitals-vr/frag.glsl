// Insert your complex math, phase logic, and transmittance here
uniform mat4 modelMatrix;
varying vec3 vWorldPosition;

void main() {
    // Three.js automatically provides cameraPosition
    vec3 worldRayDir = normalize(vWorldPosition - cameraPosition);
    
    // Transform ray origin and direction into the box's local space
    mat4 inverseModel = inverse(modelMatrix);
    vec3 local_ro = (inverseModel * vec4(cameraPosition, 1.0)).xyz;
    vec3 local_rd = normalize((inverseModel * vec4(worldRayDir, 0.0)).xyz);
    
    // Now run your standard raymarching loop using local_ro and local_rd

    // gl_FragColor = vec4(local_rd, 1.0);
    gl_FragColor = vec4(1.0, 1.0, 0.4, 1.0);
}