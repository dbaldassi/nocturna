// Noise animation - Lava
// by nimitz (twitter: @stormoid)
// https://www.shadertoy.com/view/lslXRS
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

//Somewhat inspired by the concepts behind "flow noise"
//every octave of noise is modulated separately
//with displacement using a rotated vector field

//This is a more standard use of the flow noise
//unlike my normalized vector field version (https://www.shadertoy.com/view/MdlXRS)
//the noise octaves are actually displaced to create a directional flow

//Sinus ridged fbm is used for better effect.

precision highp float;

uniform float time;
varying vec2 vUV;

// --- Simple hash noise (remplace texture noise) ---
float hash21(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); 
}

mat2 makem2(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s, s, c);
}

// Simple procedural noise (remplace texture noise)
float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    // Four corners in 2D of a tile
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

vec2 gradn(vec2 p) {
    float ep = .09;
    float gradx = noise(vec2(p.x + ep, p.y)) - noise(vec2(p.x - ep, p.y));
    float grady = noise(vec2(p.x, p.y + ep)) - noise(vec2(p.x, p.y - ep));
    return vec2(gradx, grady);
}

float flow(vec2 p, float time) {
    float z = 2.0;
    float rz = 0.0;
    vec2 bp = p;
    for (float i = 1.0; i < 7.0; i++) {
        p += time * 0.6;
        bp += time * 1.9;
        vec2 gr = gradn(i * p * 0.34 + time * 1.0);
        gr *= makem2(time * 6.0 - (0.05 * p.x + 0.03 * p.y) * 40.0);
        p += gr * 0.5;
        rz += (sin(noise(p) * 7.0) * 0.5 + 0.5) / z;
        p = mix(bp, p, 0.77);
        z *= 1.4;
        p *= 2.0;
        bp *= 1.9;
    }
    return rz;
}

void main(void) {
    // UV remapping
    vec2 p = vUV - 0.5;
    p.x *= 1.0; // Optionally adjust aspect ratio if needed
    p *= 3.0;
    float rz = flow(p, time * 0.1);

    vec3 col = vec3(0.2, 0.07, 0.01) / rz;
    col = pow(col, vec3(1.4));
    gl_FragColor = vec4(col, 1.0);
}