import { CharacterInput } from "./types";

export class InputHandler {
    private keys: { [key: string]: boolean } = {};
    private key_once: string[] = [];
    private keyBindings: { [action: string]: string[] } = {
        left: ["a", "ArrowLeft"],
        right: ["d", "ArrowRight"],
        forward: ["w", "ArrowUp"],
        backward: ["s", "ArrowDown"],
        dash: ["Shift"],
        rotate_left_x: ["x", "X"],
        rotate_right_x: ["c", "C"],
        rotate_left_y: ["y", "Y"],
        rotate_right_y: ["u", "U"],
        rotate_left_z: ["h", "H"],
        rotate_right_z: ["j", "J"],
        pov: ["p", "P"],
        jump: [" "],
    };

    constructor() {
        this.key_once = ["x", "X", "c", "C", "y", "Y", "u", "U", "h", "H", "p", "P", "j", "J"];

        window.addEventListener("keydown", (event) => {
            if (!this.key_once.includes(event.key)) {
                this.keys[event.key] = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.key] = !this.keys[event.key];
        });
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