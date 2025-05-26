import { ShaderMaterial } from "@babylonjs/core";

export function createEvilPortalMaterial(scene) {
    const shaderMaterial = new ShaderMaterial("evilPortal", scene, "/shaders/evilPortal", {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMaterial.setFloat("time", 0);
    return shaderMaterial;
}

export function createLavaMaterial(scene) {
    const shaderMaterial = new ShaderMaterial("lavaMaterial", scene, "/shaders/lava", {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMaterial.setFloat("time", 0);
    return shaderMaterial;
}