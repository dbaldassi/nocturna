var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader } from "@babylonjs/core";
import Tank from "./tank";
import Dude from "./Dude";
import HavokPhysics from "@babylonjs/havok";
class App {
    constructor() {
        Object.defineProperty(this, "engine", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "v", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "inputStates", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "freeCamera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tank", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hero", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "followCamera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "havokInstance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dudes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);
        this.inputStates = {};
        this.engine = new Engine(this.canvas, true);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initGame();
            this.gameLoop();
            this.endGame();
        });
    }
    getInitializedHavok() {
        return __awaiter(this, void 0, void 0, function* () {
            const havok = yield HavokPhysics({
                locateFile: (_) => {
                    return "assets/HavokPhysics.wasm";
                }
            });
            return havok;
        });
    }
    initGame() {
        return __awaiter(this, void 0, void 0, function* () {
            this.havokInstance = yield this.getInitializedHavok();
            this.scene = this.createScene();
            this.modifySettings(this.scene, this.inputStates);
        });
    }
    endGame() {
    }
    gameLoop() {
        const divFps = document.getElementById("fps");
        this.engine.runRenderLoop(() => {
            this.scene.render();
            if (this.dudes) {
                for (let i = 0; i < this.dudes.length; i++) {
                    this.dudes[i].move(this.scene);
                }
            }
            this.tank.move(this.inputStates);
            this.tank.fire(this.inputStates, this.scene, this.dudes);
            divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        });
    }
    createScene() {
        let scene = new Scene(this.engine);
        const hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
        let camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
        camera.attachControl(this.canvas, true);
        let light1 = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        let sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
        let sphereMaterial = new StandardMaterial("sphereRed", scene);
        sphereMaterial.diffuseColor = new Color3(1, 0, 0);
        sphere.material = sphereMaterial;
        this.createGround(scene);
        this.createTank(scene);
        this.createHeroDude(scene);
        this.followCamera = this.createFollowCamera(scene, this.tank.tankMesh);
        scene.activeCamera = this.followCamera;
        let boxDebug = MeshBuilder.CreateBox("boxDebug", { width: 5, depth: 5, height: 5 });
        boxDebug.position = new Vector3(10, 30, 5);
        const boxAggregate = new PhysicsAggregate(boxDebug, PhysicsShapeType.BOX, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
        this.createBoxes(300, this.scene);
        return scene;
    }
    createBoxes(nb, scene) {
        let materials = [];
        let mat1 = new PBRMaterial("mat1", scene);
        mat1.albedoColor = new Color3(0.8, 0.5, 0.5);
        mat1.roughness = 0.4;
        mat1.metallic = 1;
        materials.push(mat1);
        let mat2 = new PBRMaterial("mat2", scene);
        mat2.albedoColor = new Color3(0.5, 0.8, 0.5);
        mat2.roughness = 0.4;
        mat2.metallic = 1;
        materials.push(mat2);
        let mat3 = new PBRMaterial("mat3", scene);
        mat3.albedoColor = new Color3(0.5, 0.5, 0.8);
        mat3.roughness = 0.4;
        mat3.metallic = 1;
        materials.push(mat3);
        for (let i = 0; i < nb; i++) {
            let typeOfMesh = Math.floor(Math.random() * 5);
            let indexMaterial = Math.floor(Math.random() * 3);
            switch (typeOfMesh) {
                case 0:
                    const w = Math.floor(Math.random() * 5) + 1;
                    const h = Math.floor(Math.random() * 5) + 1;
                    const d = Math.floor(Math.random() * 5) + 1;
                    let box = MeshBuilder.CreateBox("box" + i, { width: w, depth: d, height: h }, this.scene);
                    box.material = materials[indexMaterial];
                    box.position = new Vector3(10, 30, 5);
                    const boxAggregate = new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
                    break;
                case 1:
                    const diameter = Math.floor(Math.random() * 5) + 1;
                    let sphere = MeshBuilder.CreateSphere("sphere" + i, { diameter: diameter }, this.scene);
                    sphere.material = materials[indexMaterial];
                    sphere.position = new Vector3(10, 30, 5);
                    const sphereAggregate = new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
                    break;
                case 2:
                    const diam = Math.floor(Math.random() * 5) + 1;
                    const height = diam * 2;
                    let cylinder = MeshBuilder.CreateCylinder("cylinder" + i, { diameter: diam, height: height }, this.scene);
                    cylinder.material = materials[indexMaterial];
                    cylinder.position = new Vector3(10, 30, 5);
                    const cylinderAggregate = new PhysicsAggregate(cylinder, PhysicsShapeType.CYLINDER, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
                    break;
                case 3:
                    const diam1 = Math.floor(Math.random() * 5) + 1;
                    const thickness = diam1 / 2;
                    let torus = MeshBuilder.CreateTorus("torus" + i, { diameter: diam1, thickness: thickness }, this.scene);
                    torus.material = materials[indexMaterial];
                    torus.position = new Vector3(10, 30, 5);
                    const torusAggregate = new PhysicsAggregate(torus, PhysicsShapeType.CONVEX_HULL, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
                    break;
                case 4:
                    const diam2 = Math.floor(Math.random() * 5) + 1;
                    let goldberg = MeshBuilder.CreateGoldberg("goldberg" + i, { size: diam2 }, this.scene);
                    goldberg.material = materials[indexMaterial];
                    goldberg.position = new Vector3(10, 30, 5);
                    const goldbergAggregate = new PhysicsAggregate(goldberg, PhysicsShapeType.CONVEX_HULL, { mass: .25, friction: 0.75, restitution: 0.3 }, scene);
                    break;
            }
        }
    }
    createTank(scene) {
        this.tank = new Tank(scene);
    }
    createHeroDude(scene) {
        SceneLoader.ImportMesh("him", "models/Dude/", "Dude.babylon", scene, (newMeshes, _, skeletons) => {
            let heroDude = newMeshes[0];
            heroDude.position = new Vector3(0, 0, 5);
            heroDude.scaling = new Vector3(0.2, 0.2, 0.2);
            heroDude.name = "heroDude";
            let dudeSpeed = 10;
            let animationSpeed = dudeSpeed / 10;
            let a = scene.beginAnimation(skeletons[0], 0, 120, true, animationSpeed);
            this.hero = new Dude(heroDude, a, scene, 20);
            this.dudes = [];
            this.dudes.push(this.hero);
            for (let i = 0; i < 10; i++) {
                let dudeMeshClone = this.doClone(heroDude, skeletons, i);
                a = scene.beginAnimation(dudeMeshClone.skeleton, 0, 120, true, animationSpeed);
                this.dudes.push(new Dude(dudeMeshClone, a, scene, dudeSpeed));
            }
        });
    }
    doClone(originalMesh, skeletons, id) {
        let myClone;
        let xrand = Math.floor(Math.random() * 500 - 250);
        let zrand = Math.floor(Math.random() * 500 - 250);
        myClone = originalMesh.clone("clone_" + id);
        myClone.position = new Vector3(xrand, 0, zrand);
        if (!skeletons)
            return myClone;
        if (!originalMesh.getChildren()) {
            myClone.skeleton = skeletons[0].clone("clone_" + id + "_skeleton");
            return myClone;
        }
        else {
            if (skeletons.length === 1) {
                let clonedSkeleton = skeletons[0].clone("clone_" + id + "_skeleton");
                myClone.skeleton = clonedSkeleton;
                let nbChildren = myClone.getChildren().length;
                for (let i = 0; i < nbChildren; i++) {
                    myClone.getChildren()[i].skeleton = clonedSkeleton;
                }
                return myClone;
            }
            else if (skeletons.length === originalMesh.getChildren().length) {
                for (let i = 0; i < myClone.getChildren().length; i++) {
                    myClone.getChildren()[i].skeleton = skeletons[i].clone("clone_" + id + "_skeleton_" + i);
                }
                return myClone;
            }
        }
        return myClone;
    }
    createFreeCamera(scene, canvas) {
        let camera = new FreeCamera("freeCamera", new Vector3(0, 50, 0), scene);
        camera.attachControl(canvas);
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.keysUp.push('z'.charCodeAt(0));
        camera.keysDown.push('s'.charCodeAt(0));
        camera.keysLeft.push('q'.charCodeAt(0));
        camera.keysRight.push('d'.charCodeAt(0));
        camera.keysUp.push('Z'.charCodeAt(0));
        camera.keysDown.push('S'.charCodeAt(0));
        camera.keysLeft.push('Q'.charCodeAt(0));
        camera.keysRight.push('D'.charCodeAt(0));
        return camera;
    }
    createFollowCamera(scene, target) {
        let camera = new FollowCamera("tankFollowCamera", target.position, scene, target);
        camera.radius = 40;
        camera.heightOffset = 14;
        camera.rotationOffset = 180;
        camera.cameraAcceleration = .1;
        camera.maxCameraSpeed = 5;
        return camera;
    }
    createGround(scene) {
        const groundOptions = { width: 2000, height: 2000, subdivisions: 20, minHeight: 0, maxHeight: 100, onReady: onGroundCreated };
        const ground = MeshBuilder.CreateGroundFromHeightMap("gdhm", 'images/hmap1.png', groundOptions, scene);
        function onGroundCreated() {
            const groundMaterial = new StandardMaterial("groundMaterial", scene);
            groundMaterial.diffuseTexture = new Texture("images/grass.jpg");
            ground.material = groundMaterial;
            ground.checkCollisions = true;
            const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0, friction: 0.7, restitution: 0.2 }, scene);
            groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        }
        return ground;
    }
    modifySettings(scene, inputStates) {
        this.scene.onPointerDown = () => {
            if (!scene.alreadyLocked) {
                console.log("requesting pointer lock");
                this.canvas.requestPointerLock();
            }
            else {
                console.log("Pointer already locked");
            }
        };
        window.addEventListener("resize", () => {
            console.log("resize");
            this.engine.resize();
        });
        window.addEventListener("keydown", (ev) => {
            if (ev.key === "I" || ev.key === "i") {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                }
                else {
                    scene.debugLayer.show();
                }
            }
        });
        document.addEventListener("pointerlockchange", () => {
            let element = document.pointerLockElement || null;
            if (element) {
                scene.alreadyLocked = true;
            }
            else {
                scene.alreadyLocked = false;
            }
        });
        inputStates.left = false;
        inputStates.right = false;
        inputStates.up = false;
        inputStates.down = false;
        inputStates.space = false;
        window.addEventListener('keydown', (event) => {
            if ((event.key === "ArrowLeft") || (event.key === "q") || (event.key === "Q")) {
                inputStates.left = true;
            }
            else if ((event.key === "ArrowUp") || (event.key === "z") || (event.key === "Z")) {
                inputStates.up = true;
            }
            else if ((event.key === "ArrowRight") || (event.key === "d") || (event.key === "D")) {
                inputStates.right = true;
            }
            else if ((event.key === "ArrowDown") || (event.key === "s") || (event.key === "S")) {
                inputStates.down = true;
            }
            else if (event.key === " ") {
                inputStates.space = true;
            }
            else if (event.key === "f") {
                inputStates.keyF = true;
            }
        }, false);
        window.addEventListener('keyup', (event) => {
            if ((event.key === "ArrowLeft") || (event.key === "q") || (event.key === "Q")) {
                inputStates.left = false;
            }
            else if ((event.key === "ArrowUp") || (event.key === "z") || (event.key === "Z")) {
                inputStates.up = false;
            }
            else if ((event.key === "ArrowRight") || (event.key === "d") || (event.key === "D")) {
                inputStates.right = false;
            }
            else if ((event.key === "ArrowDown") || (event.key === "s") || (event.key === "S")) {
                inputStates.down = false;
            }
            else if (event.key === " ") {
                inputStates.space = false;
            }
            else if (event.key === "f") {
                inputStates.keyF = false;
            }
        }, false);
    }
}
const gameEngine = new App();
gameEngine.start();
