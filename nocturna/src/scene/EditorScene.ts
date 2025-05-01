
import { Engine, Vector3, HavokPlugin, FreeCamera } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";import { ParentNode } from "../ParentNode";
import { Cube } from "../Cube";
import { CharacterInput } from "../types";

const CUBE_SIZE = 3000;

export class EditorScene extends BaseScene {

    private parentNode: ParentNode;
    private cube: Cube;
    private camera: FreeCamera;

    constructor(engine: Engine) {
        super(engine);
    }

    static async createScene(engine: Engine) {
        const scene = new EditorScene(engine);
        scene.parentNode = new ParentNode(Vector3.Zero(), scene.scene);
        scene.parentNode.setupKeyActions(scene.inputHandler);
        scene.cube = new Cube(scene.scene, CUBE_SIZE);
        scene.cube.mesh.position = new Vector3(0, CUBE_SIZE / 2, 0);

        scene.camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene.scene);
        scene.camera.setTarget(Vector3.Zero()); // La caméra regarde vers l'origine
        scene.camera.attachControl(true); // Permet de contrôler la caméra avec la souris et le clavier
        scene.camera.speed = 2; // Vitesse de la caméra

        scene.scene.activeCamera = scene.camera;

        return scene;
    }

    private moveCamera(dt:number, input: CharacterInput) {
        const moveSpeed = this.camera.speed * dt;
        this.camera.position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.camera.position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.moveCamera(dt, input);

        this.parentNode.update();
    }
}