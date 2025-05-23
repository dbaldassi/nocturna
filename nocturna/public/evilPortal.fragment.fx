precision highp float;
uniform float time;
varying vec2 vUV;
void main(void) {
    vec2 uv = vUV - 0.5;
    float r = length(uv);
    float swirl = sin(10.0 * atan(uv.y, uv.x) + time * 2.0) * 0.1;
    float portal = smoothstep(0.45 + swirl, 0.2, r);
    vec3 color = mix(vec3(0.2, 0, 0.3), vec3(1, 0, 0.5), portal);
    gl_FragColor = vec4(color, portal);
}