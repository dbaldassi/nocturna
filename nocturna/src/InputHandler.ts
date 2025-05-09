import { CharacterInput } from "./types";
import { KeybindsManager } from "./Keybinds";

export class InputHandler {
    private keys: { [key: string]: boolean } = {};
    private keyBindings: { [action: string]: string[] } = {
        left: ["a"],
        right: ["d"],
        up: ["w"],
        down: ["s"],
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
        action_1: ["1"],
        action_2: ["2"],
        action_3: ["3"],
        action_4: ["4"],
        action_5: ["5"],
        action_6: ["6"],
        action_7: ["7"],
        action_8: ["8"],
        action_9: ["9"],
        action_0: ["0"],
        action_minus: ["-"],
        action_plus: ["+"],
        save: ["Enter"],
        delete: ["Backspace"],
        clone: ["f"],
    };
    private keybindManager: KeybindsManager;
    // Store actions, which call a function when the key is pressed
    private actions: { [key: string]: () => void } = {};

    constructor() {
        window.addEventListener("keydown", (event) => {
            if (!this.keybindManager.isEditingKeybinds()) {
                // Iterate through actions and call the function if the key is pressed

                if(!this.keys[event.key]) { 
                    this.keys[event.key] = true;
                    this.run_actions();
                }
                else this.keys[event.key] = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            if (!this.keybindManager.isEditingKeybinds()) {
                this.keys[event.key] = false;
            }
        });

        this.keybindManager = new KeybindsManager(this);
    }

    public addAction(key: string, action: () => void) {
        if (this.keyBindings[key] === undefined) {
            console.warn(`Key "${key}" is not bound to any action.`);
            return;
        }

        this.actions[key] = action;
    }

    public removeAction(key: string) {
        if (this.actions[key]) {
            delete this.actions[key];
        } else {
            console.warn(`Action "${key}" does not exist.`);
        }
    }

    public removeAllActions() {
        for (const key in this.actions) {
            delete this.actions[key];
        }
        this.actions = {};
    }

    public run_actions() {
        for (const key in this.actions) {
            if (this.isKeyPressed(key)) {
                this.actions[key]();
            }
        }
    }

    getInput(): CharacterInput {
        const input = {
            left: this.isKeyPressed("left"),
            right: this.isKeyPressed("right"),
            up: this.isKeyPressed("up"),
            down: this.isKeyPressed("down"),
            jump: this.isKeyPressed("jump"),
        };

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