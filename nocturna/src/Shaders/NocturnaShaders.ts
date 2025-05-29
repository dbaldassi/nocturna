import { ShaderMaterial } from "@babylonjs/core";

/**
 * NocturnaShaders provides utility functions to create custom ShaderMaterial instances
 * for special effects in Nocturna, such as the evil portal and lava.
 * 
 * Each function returns a Babylon.js ShaderMaterial configured with the required attributes
 * and uniforms, and initializes the "time" uniform to 0.
 */

/**
 * Creates and returns a ShaderMaterial for the "evil portal" effect.
 * @param scene - The Babylon.js scene to attach the material to.
 * @returns The configured ShaderMaterial for the evil portal.
 */
export function createEvilPortalMaterial(scene) {
    const shaderMaterial = new ShaderMaterial("evilPortal", scene, "/shaders/evilPortal", {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMaterial.setFloat("time", 0);
    return shaderMaterial;
}

/**
 * Creates and returns a ShaderMaterial for the "lava" effect.
 * @param scene - The Babylon.js scene to attach the material to.
 * @returns The configured ShaderMaterial for the lava.
 */
export function createLavaMaterial(scene) {
    const shaderMaterial = new ShaderMaterial("lavaMaterial", scene, "/shaders/lava", {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMaterial.setFloat("time", 0);
    return shaderMaterial;
}