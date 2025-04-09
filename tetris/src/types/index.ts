export interface CharacterInput {
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    dash: boolean;
}

export interface Position {
    x: number;
    y: number;
}

export interface Velocity {
    x: number;
    y: number;
}