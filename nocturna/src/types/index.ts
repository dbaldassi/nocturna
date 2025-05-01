export interface CharacterInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
}

export interface AbstractState {
    enter(): void;
    exit(): void;
    update(dt: number, input : CharacterInput): AbstractState | null;
}

export interface EditorObject {

    updatePosition(dt: number, input: CharacterInput): void;
    updateRotation(dt: number, input: CharacterInput): void;
    updateScale(dt: number, input: CharacterInput): void;
    setSelected(selected: boolean): void;
    isSelected(): boolean;
    
}