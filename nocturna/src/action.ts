import { AssetsManager, Vector3 } from "@babylonjs/core";
import { FixedPlatform, ParentedPlatform, Platform } from "./GameObjects/Platform";
import { SpikeTrapFactory } from "./GameObjects/SpikeTrap";
import { MultiScene } from "./scene/MultiScene";
import { GameObject, Utils } from "./types";
import { RemoteGameObject } from "./GameObjects/RemoteGameObject";
import { NetworkManager } from "./network/NetworkManager";
import { FixedRocketFactory } from "./GameObjects/Rocket";


/**
 * The Action namespace defines multiplayer actions that can be performed in the MultiScene,
 * such as rotating the cube, placing spikes, or launching rockets.
 * 
 * Provides:
 * - Action types (enum)
 * - Callback interface for object selection
 * - Abstract base class for actions
 * - Concrete implementations for rotation, spike, and rocket actions
 */

export namespace Action {

    /**
     * Type enumerates all possible multiplayer actions.
     */
    export enum Type {
        ROTATE_X,
        ROTATE_Y,
        ROTATE_Z,
        SPIKE,
        ROCKET,
        LENGTH
    }

    /**
     * SelectObjectCallback is an interface for callbacks used when selecting an object
     * as a target for an action (e.g., placing a spike or rocket).
     */
    export interface SelectObjectCallback {
        /**
         * Called when an object is selected for the action.
         * @param object The selected GameObject.
         * @param playerTargetId The ID of the target player.
         * @returns True if the selection is valid and the action is performed, false otherwise.
         */
        onSelect(object: GameObject, playerTargetId: string): boolean;
    }

    /**
     * ActionBase is the abstract base class for all multiplayer actions.
     * 
     * - Stores the action name and reference to the MultiScene.
     * - Provides a static factory method to create actions by type.
     * - Subclasses must implement the execute() method.
     */
    export abstract class ActionBase {
        protected name: string;
        protected scene: MultiScene;

        constructor(name: string, scene: MultiScene) {
            this.name = name;
            this.scene = scene;
        }

        /**
         * Returns the name of the action.
         */
        public getName(): string {
            return this.name;
        }

        /**
         * Executes the action.
         */
        public abstract execute(): void;

        /**
         * Factory method to create an ActionBase instance by type.
         * @param type The action type.
         * @param scene The MultiScene instance.
         * @returns The created ActionBase instance.
         */
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
                case Type.ROCKET:
                    return new RocketAction("Rocket", scene);
                default:
                    return null;
            }
        }
    }

    /**
     * RotateAction rotates the parent cube around a specified axis (x, y, or z).
     * Notifies all players via the network.
     */
    export class RotateAction extends ActionBase {
        private axis: "x" | "y" | "z";

        constructor(name: string, scene: MultiScene, axis: "x" | "y" | "z") {
            super(name, scene);
            this.axis = axis;
        }

        /**
         * Executes the rotation action and sends a network update.
         */
        public execute(): void {
            const parent = this.scene.getParent();
            parent.rotate(this.axis);            

            const network = NetworkManager.getInstance();
            network.sendUpdate("rotate", {
                axis: this.axis
            });
        }
    }

    /**
     * SpikeAction allows a player to place a spike trap on a selected platform.
     * Implements SelectObjectCallback for object selection.
     */
    export class SpikeAction extends ActionBase implements Action.SelectObjectCallback {
        private factory: SpikeTrapFactory;

        constructor(name: string, scene: MultiScene) {
            super(name, scene);
            this.factory = new SpikeTrapFactory();
        }

        /**
         * Initiates the object selection process for spike placement.
         */
        public execute(): void {
            this.scene.selectObjectDrop(this);
        }

        /**
         * Called when a platform is selected for spike placement.
         * Creates the spike, adds it as a remote object, and notifies other players.
         */
        public onSelect(object: GameObject, playerTargetId: string): boolean {
            if(object.getType() === FixedPlatform.Type) {
                const totalbox = Utils.getTotalBoundingBox(object.getMeshes());
                const box = totalbox.maximum.subtract(totalbox.minimum);
                const position = object.getMesh().position.clone();
                position.y += box.y / 2 + 1; // Place spike on top of platform

                const config = {
                    scene: this.scene.getScene(),
                    position: position,
                    rotation: Vector3.Zero(),
                    size: new Vector3(box.x / 2, 0.1, box.z),
                };

                const spike = this.factory.create(config);
                const remote_spike = new RemoteGameObject(spike, spike.getId(), playerTargetId);
                this.scene.addRemoteObject(remote_spike);

                // Notify other players
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

    /**
     * RocketAction allows a player to place a rocket on a selected object.
     * Implements SelectObjectCallback for object selection.
     */
    export class RocketAction extends ActionBase implements Action.SelectObjectCallback {
        private factory: FixedRocketFactory;

        constructor(name: string, scene: MultiScene) {
            super(name, scene);
            this.factory = new FixedRocketFactory();
        }

        /**
         * Initiates the object selection process for rocket placement.
         */
        public execute(): void {
            this.scene.selectObjectDrop(this);
        }

        /**
         * Called when an object is selected for rocket placement.
         * Creates the rocket, adds it as a remote object, and notifies other players.
         */
        public onSelect(object: GameObject, playerTargetId: string): boolean {
            const position = object.getMesh().position.clone();
            const size = new Vector3(10, 10, 10); // Default rocket size
            position.y += 100; // Place rocket above the object
            position.z -= size.z / 2; // Place rocket in front of the object

            const assetsManager = new AssetsManager(this.scene.getScene());
            assetsManager.useDefaultLoadingScreen = false;

            const config = {
                assetsManager: assetsManager,
                scene: this.scene.getScene(),
                position: position,
                rotation: Vector3.Zero(),
                size: size,
            };
            const rocket = this.factory.create(config);
            const remote_rocket = new RemoteGameObject(rocket, rocket.getId(), playerTargetId);
           
            assetsManager.onFinish = () => {
                this.scene.addRemoteObject(remote_rocket);
                // Notify other players
                const network = NetworkManager.getInstance();
                network.sendUpdate("createObject", {
                    id: object.getId(),
                    owner: playerTargetId,
                    position: config.position,
                    size: config.size,
                    type: rocket.getType(),
                });
            }

            assetsManager.load();
            this.scene.doneSelectingObjectDrop();

            return true;
        }
    }
}


