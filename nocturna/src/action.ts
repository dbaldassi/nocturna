import { Vector3 } from "@babylonjs/core";
import { FixedPlatform, ParentedPlatform, Platform } from "./GameObjects/Platform";
import { SpikeTrapFactory } from "./GameObjects/SpikeTrap";
import { MultiScene } from "./scene/MultiScene";
import { GameObject, Utils } from "./types";
import { RemoteGameObject } from "./GameObjects/RemoteGameObject";
import { NetworkManager } from "./network/NetworkManager";


export namespace Action {

    export enum Type {
        ROTATE_X,
        ROTATE_Y,
        ROTATE_Z,
        SPIKE,
        ROCKET
    }

    export interface SelectObjectCallback {
        onSelect(object: GameObject, playerTargetId: string): boolean;
    }

    export abstract class ActionBase {
        protected name: string;
        protected scene: MultiScene;

        constructor(name: string, scene: MultiScene) {
            this.name = name;
            this.scene = scene;
        }

        public getName(): string {
            return this.name;
        }

        public abstract execute(): void;

        static create(type: Type, scene: MultiScene): ActionBase {
            switch (type) {
                case Type.ROTATE_X:
                    return new RotateAction("Rotate X", scene, "x");
                case Type.ROTATE_Y:
                    return new RotateAction("Rotate Y", scene, "y");
                case Type.ROTATE_Z:
                    return new RotateAction("Rotate Z", scene, "z");
                case Type.SPIKE:
                    return new SpikeAction("Spike", scene);
                /*case Type.ROCKET:
                    return new RocketAction("Rocket", scene);*/
                default:
                    return null;
            }
        }
    }

    export class RotateAction extends ActionBase {
        private axis: "x" | "y" | "z";

        constructor(name: string, scene: MultiScene, axis: "x" | "y" | "z") {
            super(name, scene);
            this.axis = axis;
        }

        public execute(): void {
            // Implementation for rotating the scene around the specified axis
            const parent = this.scene.getParent();
            parent.rotate(this.axis);            
        }
    }

    export class SpikeAction extends ActionBase implements Action.SelectObjectCallback {
        private factory: SpikeTrapFactory;

        constructor(name: string, scene: MultiScene) {
            super(name, scene);
            this.factory = new SpikeTrapFactory();
        }

        public execute(): void {
            this.scene.selectObjectDrop(this);
        }

        public onSelect(object: GameObject, playerTargetId: string): boolean {
            if(object.getType() === FixedPlatform.Type) {
                const totalbox = Utils.getTotalBoundingBox(object.getMeshes());
                const box = totalbox.maximum.subtract(totalbox.minimum);
                console.log("SpikeAction.onSelect", object.getId(), box);
                const position = object.getMesh().position.clone();
                position.y += box.y / 2 + 1; // Adjust position to be on top of the platform

                const config = {
                    scene: this.scene.getScene(),
                    position: position,
                    rotation: Vector3.Zero(),
                    size: new Vector3(box.x / 2, 0.1, box.z),
                };

                const spike = this.factory.create(config);
                const remote_spike = new RemoteGameObject(spike, spike.getId(), playerTargetId);
                this.scene.addRemoteObject(remote_spike);

                // notify othe players
                const network = NetworkManager.getInstance();
                network.sendUpdate("createObject", {
                    id: object.getId(),
                    owner: playerTargetId,
                    position: position,
                    size: config.size,
                    type: spike.getType(),
                });

                this.scene.doneSelectingObjectDrop();

                return true;
            }

            return false;
        }
    }
}


