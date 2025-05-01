import { CharacterInput } from "./types";
import { KeybindsManager } from "./Keybinds";

export class InputHandler {
    private keys: { [key: string]: boolean } = {};
    private key_once: string[] = [];
    private keyBindings: { [action: string]: string[] } = {
        left: ["a"],
        right: ["d"],
        // forward: ["w"],
        // backward: ["s"],
        // dash: ["Shift"],
        rotate_left_x: ["x"],
        rotate_right_x: ["c"],
        rotate_left_y: ["y"],
        rotate_right_y: ["u"],
        rotate_left_z: ["h"],
        rotate_right_z: ["j"],
        pov: ["p"],
        jump: [" "],
    };
    private keybindManager: KeybindsManager;

    constructor() {
        this.key_once = ["x", "c", "y", "u", "h", "p", "j"];

        window.addEventListener("keydown", (event) => {
            if (!this.keybindManager.isEditingKeybinds() && !this.key_once.includes(event.key)) {
                this.keys[event.key] = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            if (!this.keybindManager.isEditingKeybinds()) {
                this.keys[event.key] = !this.keys[event.key];
            }
        });

        this.keybindManager = new KeybindsManager(this);
    }

    getInput(): CharacterInput {
        const input = {
            left: this.isKeyPressed("left"),
            right: this.isKeyPressed("right"),
            forward: this.isKeyPressed("forward"),
            backward: this.isKeyPressed("backward"),
            dash: this.isKeyPressed("dash"),
            rotate_left_x: this.isKeyPressed("rotate_left_x"),
            rotate_right_x: this.isKeyPressed("rotate_right_x"),
            rotate_left_y: this.isKeyPressed("rotate_left_y"),
            rotate_right_y: this.isKeyPressed("rotate_right_y"),
            rotate_left_z: this.isKeyPressed("rotate_left_z"),
            rotate_right_z: this.isKeyPressed("rotate_right_z"),
            pov: this.isKeyPressed("pov"),
            jump: this.isKeyPressed("jump"),
        };

        for (let elt of this.key_once) {
            this.keys[elt] = false;
        }

        return input;
    }

    private isKeyPressed(action: string): boolean {
        return this.keyBindings[action]?.some((key) => this.keys[key]) || false;
    }

    updateKeyBindings(action: string, newKeys: string[]) {
        if (this.keyBindings[action]) {
            this.keyBindings[action] = newKeys;
        } else {
            console.warn(`Action "${action}" does not exist in key bindings.`);
        }
    }

    getKeyBindings(): { [action: string]: string[] } {
        return this.keyBindings;
    }
}