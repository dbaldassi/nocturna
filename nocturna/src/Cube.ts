import { Scene, TransformNode, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Cube {
    private scene: Scene;
    private size: number;
    private parent: TransformNode;
    mesh: any;

    constructor(scene: Scene, size: number, parent: TransformNode) {
        this.scene = scene;
        this.size = size;

        // Create a parent node for the cube
        this.parent = parent;

        // Initialize the cube
        this.createPlanes();
    }

    private createPlanes() {
        const halfSize = this.size / 2;

        // Define materials for each side of the cube
        const materials = [
            new StandardMaterial("frontMaterial", this.scene),
            new StandardMaterial("backMaterial", this.scene),
            new StandardMaterial("leftMaterial", this.scene),
            new StandardMaterial("rightMaterial", this.scene),
            new StandardMaterial("topMaterial", this.scene),
            new StandardMaterial("bottomMaterial", this.scene),
        ];

        // Assign unique colors to each material
        materials[0].diffuseColor = new Color3(1, 0, 0); // Red
        materials[1].diffuseColor = new Color3(0, 1, 0); // Green
        materials[2].diffuseColor = new Color3(0, 0, 1); // Blue
        materials[3].diffuseColor = new Color3(1, 1, 0); // Yellow
        materials[4].diffuseColor = new Color3(1, 0, 1); // Magenta
        materials[5].diffuseColor = new Color3(0, 1, 1); // Cyan

        // Create six planes at the origin
        const planes = [
            { name: "front", position: new Vector3(0, 0, -halfSize), rotation: new Vector3(0, Math.PI, 0), material: materials[0] },
            { name: "back", position: new Vector3(0, 0, halfSize), rotation: new Vector3(0, 0, 0), material: materials[1] },
            { name: "left", position: new Vector3(-halfSize, 0, 0), rotation: new Vector3(0, -Math.PI / 2, 0), material: materials[2] },
            { name: "right", position: new Vector3(halfSize, 0, 0), rotation: new Vector3(0, Math.PI / 2, 0), material: materials[3] },
            { name: "top", position: new Vector3(0, halfSize, 0), rotation: new Vector3(-Math.PI / 2, 0, 0), material: materials[4] },
            { name: "bottom", position: new Vector3(0, -halfSize, 0), rotation: new Vector3(Math.PI / 2, 0, 0), material: materials[5] },
        ];

        planes.forEach(plane => {
            const planeMesh = MeshBuilder.CreatePlane(plane.name, { size: this.size }, this.scene);
            planeMesh.position = plane.position;
            planeMesh.rotation = plane.rotation;
            planeMesh.material = plane.material;
            planeMesh.parent = this.parent;

            // Add physics to the plane
            new PhysicsAggregate(planeMesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.3 }, this.scene);
        });
    }

    public getParent(): TransformNode {
        return this.parent;
    }
}