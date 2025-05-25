import { ShaderMaterial } from "@babylonjs/core";

export function createEvilPortalMaterial(scene) {
    const shaderMaterial = new ShaderMaterial("evilPortal", scene, "/shaders/evilPortal", {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMaterial.setFloat("time", 0);
    return shaderMaterial;
}