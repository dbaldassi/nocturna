import { CharacterInput } from "./types";

export class InputHandler {
    private keys: { [key: string]: boolean } = {};
    private key_once: string[] = [];

    constructor() {
        this.key_once = [ "x", "X", "c", "C", "y", "Y", "u", "U", "h", "H", "p", "P"];

        window.addEventListener("keydown", (event) => {
            if(!this.key_once.includes(event.key)) {
                this.keys[event.key] = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.key] = !this.keys[event.key];
        });
    }

    getInput(): CharacterInput {
        const intput =  {
            left: this.keys["a"] || this.keys["ArrowLeft"] || false,
            right: this.keys["d"] || this.keys["ArrowRight"] || false,
            forward: this.keys["w"] || this.keys["ArrowUp"] || false,
            backward: this.keys["s"] || this.keys["ArrowDown"] || false,
            dash: this.keys["Shift"] || false,
            rotate_left_x: this.keys["x"] || this.keys["X"],
            rotate_right_x: this.keys["c"] || this.keys["C"],
            rotate_left_y: this.keys["y"] || this.keys["Y"],
            rotate_right_y: this.keys["u"] || this.keys["U"],
            rotate_left_z: this.keys["h"] || this.keys["H"] ,
            rotate_right_z: this.keys["j"] || this.keys["J"],
            pov: this.keys["p"] || this.keys["P"],
            jump: this.keys[" "] || false,
        };

        for(let elt of this.key_once) {
            this.keys[elt] = false;
        }

        return intput;
    }
}