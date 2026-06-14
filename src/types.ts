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
    sunHappy: HTMLImageElement;
    sunShocked: HTMLImageElement;
}

export type GameInputAction = "game" | "intro";

export interface GameInputs {
    player1Name: string;
    player2Name: string;
    rounds: number;
    gravity: number;
    nextAction: GameInputAction;
}

export interface ShotResult {
    playerHit: number;
    sunHit: boolean;
}

export interface TurnResult {
    scoringPlayer: number;
    sunHit: boolean;
}
