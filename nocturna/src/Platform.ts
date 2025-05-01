import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Texture, Mesh } from "@babylonjs/core";
import { ParentNodeObserver, ParentNode } from "./ParentNode";
import { CharacterInput, EditorObject } from "./types";

export class Platform  {

    protected mesh: Mesh;
    protected scene: Scene;

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public update(dt: number) {
    }
}

export class ParentedPlatform extends Platform implements ParentNodeObserver {

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public onRotationChange() {
        this.recreatePhysicsBody();
    }

    public recreatePhysicsBody() {
        // Supprimez l'ancien corps physique
        if (this.mesh.physicsBody) {
            this.mesh.physicsBody.dispose();
        }
    
        // Créez un nouveau corps physique avec les nouvelles transformations
        new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, this.scene);
    }

}

export class FixedPlatform extends Platform  {

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }
}
export class PlatformEditorDelegate implements EditorObject { 
    private platform: Platform;
    private selected: boolean = false;
    private readonly speed: number = 1;

    constructor(platform: Platform) {
        this.platform = platform;
    }

    public updatePosition(dt: number, input: CharacterInput): void {
        const moveSpeed = this.speed * dt;
        this.platform.getMesh().position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.platform.getMesh().position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateRotation(dt: number, input: CharacterInput): void {
        const moveSpeed = this.speed * dt;
        this.platform.getMesh().rotation.y += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.platform.getMesh().rotation.x += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateScale(dt: number, input: CharacterInput): void {
        // Implement scale logic if needed
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;
    }

    public isSelected(): boolean {
        return this.selected;
    }
}


export class FixedPlatformEditor extends FixedPlatform  implements EditorObject {
    private platform:  FixedPlatform;
    private delegate: PlatformEditorDelegate;

    constructor(scene: Scene, platform: Platform) {
        super(null, scene);
        this.platform = platform as FixedPlatform;
        this.delegate = new PlatformEditorDelegate(this.platform);
    }

    public update(dt: number) {

    }

    public updatePosition(dt: number, input: CharacterInput): void {
        this.delegate.updatePosition(dt, input);
    }
    public updateRotation(dt: number, input: CharacterInput): void {
        this.delegate.updateRotation(dt, input);
    }
    public updateScale(dt: number, input: CharacterInput): void {
        this.delegate.updateScale(dt, input);
    }
    public setSelected(selected: boolean): void {
        this.delegate.setSelected(selected);
    }
    public isSelected(): boolean {
        return this.delegate.isSelected();
    }
}

export class ParentedPlatformEditor extends ParentedPlatform  {
    private platform:  ParentedPlatform;
    private delegate: PlatformEditorDelegate;

    constructor(scene: Scene, platform: Platform) {
        super(null, scene);
        this.platform = platform as ParentedPlatform;
        this.delegate = new PlatformEditorDelegate(this.platform);
    }

    public update(dt: number) {

    }

    public updatePosition(dt: number, input: CharacterInput): void {
        this.delegate.updatePosition(dt, input);
    }
    public updateRotation(dt: number, input: CharacterInput): void {
        this.delegate.updateRotation(dt, input);
    }
    public updateScale(dt: number, input: CharacterInput): void {
        this.delegate.updateScale(dt, input);
    }
    public setSelected(selected: boolean): void {
        this.delegate.setSelected(selected);
    }
    public isSelected(): boolean {
        return this.delegate.isSelected();
    }
}

export interface PlatformConfig {
    size: Vector3;
    position: Vector3;
    rotation: Vector3;
    parent?: ParentNode;
    scene: Scene;
}

export interface PlatformFactory {
    /**
     * Méthode abstraite pour créer une plateforme.
     * Les sous-classes concrètes implémenteront cette méthode.
     */
    create(PlatformConfig): Platform;
    createForEditor(PlatformConfig): EditorObject;
}

export class ParentedPlatformFactory implements PlatformFactory {

    private createWithoutPhysics(config: PlatformConfig): ParentedPlatform {
        const mesh = MeshBuilder.CreateBox("platform", { width: config.size.x, height: config.size.y, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", config.scene);
        material.diffuseTexture = new Texture("images/wood.jpg", config.scene); // Replace with the path to your wood texture
        material.backFaceCulling = false; // Ensure the texture is visible from all sides
        mesh.material = material;

        const platform = new ParentedPlatform(mesh, config.scene);
        config.parent.addChild(mesh);

        return platform;
    }

    public create(config: PlatformConfig): Platform {
        const platform = this.createWithoutPhysics(config);

        // Add physics to the platform
        new PhysicsAggregate(platform.getMesh(), PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        config.parent.addObserver(platform);

        return platform;
    }

    public createForEditor(config: PlatformConfig): EditorObject {
        const actual_platform = this.createWithoutPhysics(config);

        const platform = new FixedPlatformEditor(config.scene, actual_platform);        
        return platform;
    }
}

export class FixedPlatformFactory implements PlatformFactory {
    public create(config: PlatformConfig): Platform {
        const mesh = MeshBuilder.CreateBox("platform", { width: config.size.x, height: config.size.y, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", config.scene);
        // material.diffuseTexture = new Texture("images/wood.jpg", scene); // Replace with the path to your wood texture
        // material.backFaceCulling = false; // Ensure the texture is visible from all sides
        material.diffuseColor = Color3.Blue(); // Set the color to red
        mesh.material = material;

        const platform = new FixedPlatform(mesh, config.scene);

        return platform;
    }

    public createForEditor(config: PlatformConfig): EditorObject {
        const actual_platform = this.create(config);
        const platform = new ParentedPlatformEditor(config.scene, actual_platform);        
        return platform;
    }
}
