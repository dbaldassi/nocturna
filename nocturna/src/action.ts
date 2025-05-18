import { MultiScene } from "./scene/MultiScene";


export namespace Action {

    export enum Type {
        ROTATE_X,
        ROTATE_Y,
        ROTATE_Z,
        SPIKE,
        ROCKET
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
                /*case Type.SPIKE:
                    return new SpikeAction("Spike", scene);
                case Type.ROCKET:
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
}


