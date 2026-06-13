export interface Point {
    x: number;
    y: number;
}

export interface Gorilla {
    x: number;
    y: number;
}

export interface GameState {
    gravity: number;
    wind: number;
    players: [Gorilla, Gorilla];
}

export interface Sprites {
    gorillaArmsDown: HTMLImageElement;
    gorillaLeftArmUp: HTMLImageElement;
    gorillaRightArmUp: HTMLImageElement;
    bananas: [
        HTMLImageElement,
        HTMLImageElement,
        HTMLImageElement,
        HTMLImageElement,
    ];
}
