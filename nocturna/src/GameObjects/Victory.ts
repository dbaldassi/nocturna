/**
 * Victory.ts defines the VictoryCondition game object and its factory for creating victory triggers in the game.
 * 
 * Responsibilities:
 * - Implements the VictoryCondition class, representing the victory trigger (end-of-level goal).
 * - Handles mesh creation, animation, physics, sound, and particle effects for the victory object.
 * - Provides a VictoryConditionFactory for instantiating victory triggers in the game or editor.
 * - Integrates with Babylon.js for mesh, material, physics, animation, and particle management.
 * 
 * Usage:
 * - Use `VictoryConditionFactory.create(config)` to create a victory trigger for gameplay (with physics and collision).
 * - Use `VictoryConditionFactory.createForEditor(config)` to create a victory trigger for the editor (without physics).
 * - The victory object can be visited by a GameObjectVisitor, which triggers the victory sound and stops animation.
 * - The object supports animation, sound playback, and reacts to parent node rotation changes.
 */

import { Animation, Scene, Mesh, PhysicsAggregate, StaticSound, Vector3, PhysicsShapeType, Color3, DynamicTexture, ParticleSystem, Color4, PBRMaterial, CubeTexture } from "@babylonjs/core";
import { App } from "../app";
import { ParentNodeObserver } from "../ParentNode";
import { GameObject, CharacterInput, GameObjectVisitor, GameObjectObserver, GameObjectFactory, GameObjectConfig, Utils, EditorObject } from "../types";
import { ObjectEditorImpl } from "./EditorObject";


/**
 * VictoryCondition represents the end-of-level victory trigger in the game.
 * - Handles mesh, physics, animation, sound, and particle effects.
 * - Implements the GameObject and ParentNodeObserver interfaces.
 */
export class VictoryCondition implements GameObject, ParentNodeObserver {
    public static readonly Type: string = "victory_condition";
    private static nextId: number = 0;
    private scene: Scene;
    public mesh: Mesh[] = [];
    private id: string;
    public victoryAggregate: PhysicsAggregate;
    private sounds: Map<string, StaticSound> = new Map();

    /**
     * Constructs a new VictoryCondition.
     * @param mesh The mesh for the victory object.
     * @param scene The Babylon.js scene.
     */
    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        if (mesh) {
            this.mesh = [mesh];
        }
        this.id = `${VictoryCondition.Type}_${VictoryCondition.nextId++}`;
    }

    /**
     * Adds a sound effect to the victory object.
     * @param name The sound name.
     * @param sound The StaticSound instance.
     */
    public addSound(name: string, sound: StaticSound): void {
        this.sounds.set(name, sound);
    }

    /**
     * Plays a sound effect by name.
     * @param name The sound name.
     */
    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound ${name} not found for victory condition.`);
        }
    }

    /**
     * Returns the unique ID of the victory object.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Returns all meshes associated with the victory object.
     */
    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    /**
     * Returns the type of the object ("victory_condition").
     */
    public getType(): string {
        return VictoryCondition.Type;
    }

    /**
     * Starts the floating animation for the victory object.
     */
    public startAnimation(): void {
        this.animate();
    }

    /**
     * Called when the parent node starts rotating (not used here).
     */
    public onRotationStart(): void { }

    /**
     * Called when the parent node's rotation changes.
     * Updates the physics body to match the mesh's new position and rotation.
     */
    public onRotationChange(): void {
        const mesh = this.getMesh();
        const physicsBody = mesh.physicsBody;
        if (physicsBody) {
            const newPosition = mesh.position;
            const newRotation = mesh.rotationQuaternion;

            physicsBody.disablePreStep = false;
            physicsBody.transformNode.position.set(newPosition.x, newPosition.y, newPosition.z);
            physicsBody.transformNode.rotationQuaternion.set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);
            this.scene.onAfterRenderObservable.addOnce(() => {
                physicsBody.disablePreStep = true;
            });
        }
    }

    /**
     * Animates the victory object with a floating up-and-down motion.
     */
    public animate() {
        const animationY = new Animation("coinAnimationY", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        animationY.dataType = Animation.ANIMATIONTYPE_FLOAT;
        animationY.loopMode = Animation.ANIMATIONLOOPMODE_CYCLE;
        const keysY = [
            { frame: 0, value: this.getMesh().position.y },
            { frame: 30, value: this.getMesh().position.y + 2 },
            { frame: 60, value: this.getMesh().position.y },
        ];
        animationY.setKeys(keysY);
        this.getMesh().animations.push(animationY);

        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }

    /**
     * Returns the main mesh of the victory object.
     */
    public getMesh(): Mesh {
        return this.mesh[0];
    }

    /**
     * Updates the victory object (no-op).
     */
    public update(__: number, _: CharacterInput): void { }

    /**
     * Accepts a visitor (for the visitor pattern).
     * Stops animation, triggers the visitor's victory logic, and plays the victory sound.
     * @param visitor The GameObjectVisitor.
     */
    public accept(visitor: GameObjectVisitor): void {
        this.scene.stopAnimation(this.mesh);
        visitor.visitVictory(this);
        this.playSound("victory");
    }

    /**
     * Handles logic when the game is paused (no-op).
     */
    public onPause(): void { }

    /**
     * Handles logic when the game is resumed (no-op).
     */
    public onResume(): void { }

    /**
     * Handles contact events (not used for victory objects).
     * @returns Always false.
     */
    public onContact(): boolean {
        return false;
    }

    /**
     * Adds an observer to the victory object (not used).
     */
    public addObserver(_: GameObjectObserver): void { }
}

export class FixedVictoryCondition extends VictoryCondition {
    public static readonly Type: string = "fixed_victory_condition";
}

/**
 * VictoryConditionFactory creates VictoryCondition instances for gameplay or the editor.
 * - Handles mesh loading, configuration, physics, animation, sound, and particle effects.
 */
export class VictoryConditionFactory implements GameObjectFactory {

    /**
     * Internal method to create and configure a VictoryCondition.
     * @param config The configuration for the victory object.
     * @param physics Whether to enable physics.
     */
    protected createImpl(config: GameObjectConfig, physics: boolean): VictoryCondition {
        const victory = new VictoryCondition(null, config.scene);
        if (!config.size) {
            config.size = new Vector3(20, 20, 20);
        }

        const path = App.selectedGraphics + "/" + VictoryCondition.Type + ".glb";

        Utils.createMeshTask(config, VictoryCondition.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            meshes[0].name = VictoryCondition.Type;
            config.position = Utils.calculatePositionRelativeToParent(config.parent, config.position);
            config.rotation = Utils.calculateRotationRelativeToParent(config.parent, config.rotation);
            Utils.configureMesh(meshes, config);

            config.parent.addChild(meshes[0]);

            meshes.forEach((m) => {
                victory.mesh.push(m);
            });

            if (physics) {
                const p = new PhysicsAggregate(meshes[0], PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, config.scene);
                p.body.setCollisionCallbackEnabled(true);
                config.parent.addObserver(victory);
                victory.victoryAggregate = p;
                victory.startAnimation();
            }

            // Particle system for visual effect
            const meshColor = meshes[1].material?.diffuseColor ?? new Color3(0, 0.2, 1);

            const dynTex = new DynamicTexture("sparkDynTex", { width: 16, height: 16 }, config.scene, false);
            const ctx = dynTex.getContext();
            ctx.fillStyle = `rgb(${Math.floor(meshColor.r * 255)},${Math.floor(meshColor.g * 255)},${Math.floor(meshColor.b * 255)})`;
            ctx.beginPath();
            ctx.arc(8, 8, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(8, 8, 8, 0, 2 * Math.PI);
            ctx.stroke();
            dynTex.update();

            const sparkParticles = new ParticleSystem("sparks", 100, config.scene);
            sparkParticles.particleTexture = dynTex;
            sparkParticles.emitter = meshes[0];
            sparkParticles.minEmitBox = new Vector3(-0.2, 0, -0.2);
            sparkParticles.maxEmitBox = new Vector3(0.5, 0, 0.5);
            sparkParticles.color1 = new Color4(1, 1, 0.5, 1);
            sparkParticles.color2 = new Color4(1, 0.8, 0.2, 1);
            sparkParticles.minSize = 0.5;
            sparkParticles.maxSize = 1;
            sparkParticles.minLifeTime = 1;
            sparkParticles.maxLifeTime = 2;
            sparkParticles.emitRate = 15;
            sparkParticles.direction1 = new Vector3(-1, 1, -1);
            sparkParticles.direction2 = new Vector3(1, 1, 1);
            sparkParticles.gravity = new Vector3(0, -9.81, 0);
            sparkParticles.start();

            // PBR material for shiny effect
            const pbr = new PBRMaterial("victoryPBR", config.scene);
            pbr.albedoColor = meshes[1].material?.diffuseColor ?? new Color3(0, 0.2, 1);
            pbr.metallic = 0.8;
            pbr.roughness = 0.1;
            pbr.reflectionTexture = new CubeTexture("https://playground.babylonjs.com/textures/environment.env", config.scene);
            pbr.reflectivityColor = new Color3(0.2, 0.8, 1);

            meshes[1].material = pbr;
        });

        Utils.loadSound(config.assetsManager, "victory", "assets/sounds/crystal.ogg", (sound) => {
            victory.addSound("victory", sound);
        });

        return victory;
    }

    /**
     * Creates a VictoryCondition for gameplay, with physics and collision.
     * @param config The configuration for the victory object.
     */
    public create(config: GameObjectConfig): VictoryCondition {
        return this.createImpl(config, true);
    }

    /**
     * Creates a VictoryCondition for the editor (no physics).
     * @param config The configuration for the victory object.
     */
    public createForEditor(config: GameObjectConfig): EditorObject {
        const victory = this.createImpl(config, false);
        const editor = new ObjectEditorImpl(victory);
        return editor;
    }
}

export class FixedVictoryConditionFactory extends VictoryConditionFactory {
    protected createImpl(config: GameObjectConfig, physics: boolean): VictoryCondition {
        const victory = new VictoryCondition(null, config.scene);
        if (!config.size) {
            config.size = new Vector3(20, 20, 20);
        }

        const path = App.selectedGraphics + "/" + VictoryCondition.Type + ".glb";

        Utils.createMeshTask(config, VictoryCondition.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            meshes[0].name = VictoryCondition.Type;
            config.position = Utils.calculatePositionRelativeToParent(config.parent, config.position);
            config.rotation = Utils.calculateRotationRelativeToParent(config.parent, config.rotation);
            Utils.configureMesh(meshes, config);

            // config.parent.addChild(meshes[0]);

            meshes.forEach((m) => {
                victory.mesh.push(m);
            });

            if (physics) {
                const p = new PhysicsAggregate(meshes[0], PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, config.scene);
                p.body.setCollisionCallbackEnabled(true);
                config.parent.addObserver(victory);
                victory.victoryAggregate = p;
                victory.startAnimation();
            }

            // Particle system for visual effect
            const meshColor = meshes[1].material?.diffuseColor ?? new Color3(0, 0.2, 1);

            const dynTex = new DynamicTexture("sparkDynTex", { width: 16, height: 16 }, config.scene, false);
            const ctx = dynTex.getContext();
            ctx.fillStyle = `rgb(${Math.floor(meshColor.r * 255)},${Math.floor(meshColor.g * 255)},${Math.floor(meshColor.b * 255)})`;
            ctx.beginPath();
            ctx.arc(8, 8, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(8, 8, 8, 0, 2 * Math.PI);
            ctx.stroke();
            dynTex.update();

            const sparkParticles = new ParticleSystem("sparks", 100, config.scene);
            sparkParticles.particleTexture = dynTex;
            sparkParticles.emitter = meshes[0];
            sparkParticles.minEmitBox = new Vector3(-0.2, 0, -0.2);
            sparkParticles.maxEmitBox = new Vector3(0.5, 0, 0.5);
            sparkParticles.color1 = new Color4(1, 1, 0.5, 1);
            sparkParticles.color2 = new Color4(1, 0.8, 0.2, 1);
            sparkParticles.minSize = 0.5;
            sparkParticles.maxSize = 1;
            sparkParticles.minLifeTime = 1;
            sparkParticles.maxLifeTime = 2;
            sparkParticles.emitRate = 15;
            sparkParticles.direction1 = new Vector3(-1, 1, -1);
            sparkParticles.direction2 = new Vector3(1, 1, 1);
            sparkParticles.gravity = new Vector3(0, -9.81, 0);
            sparkParticles.start();

            // PBR material for shiny effect
            const pbr = new PBRMaterial("victoryPBR", config.scene);
            pbr.albedoColor = meshes[1].material?.diffuseColor ?? new Color3(0, 0.2, 1);
            pbr.metallic = 0.8;
            pbr.roughness = 0.1;
            pbr.reflectionTexture = new CubeTexture("https://playground.babylonjs.com/textures/environment.env", config.scene);
            pbr.reflectivityColor = new Color3(0.2, 0.8, 1);

            meshes[1].material = pbr;
        });

        Utils.loadSound(config.assetsManager, "victory", "assets/sounds/crystal.ogg", (sound) => {
            victory.addSound("victory", sound);
        });

        return victory;
    }
}
