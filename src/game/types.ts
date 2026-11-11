import type { OnscreenKeyboardLayout } from "../lib/OnscreenKeyboard.svelte";

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

export type InputIntent =
    | { kind: "text" }
    | { kind: "continue" }
    | {
        kind: "angle" | "velocity";
        state: GameState;
        playerNumber: 0 | 1;
    };

export interface InputRequest {
    id: string;
    onscreenKeyboardLayout: OnscreenKeyboardLayout;
    intent: InputIntent;
}

export interface InputReader {
    readKey(): Promise<string>;
    destroy(): void;
}

export interface Player {
    /**
     * Called on every player at each synchronization point. Only players
     * connected to a remote peer need to do anything here.
     */
    synchronize(syncId: string): Promise<void>;
    /**
     * Called on every player after a banana impact to verify that all
     * participants computed the same impact coordinates.
     */
    confirmImpact(x: number, y: number): Promise<void>;
    /**
     * Called on the player that owns the requested input. The returned
     * reader produces that player's keys until it is destroyed.
     */
    beginInput(request: InputRequest): InputReader;
    /**
     * Called on the configuring player (player 1) to determine the random
     * seed for a game.
     */
    readSeed(): Promise<number>;
}

export type Players = [Player, Player];

export interface MultiplayerSession {
    localPlayer: 0 | 1;
    sendKey(inputId: string, key: string): void;
    receiveKey(inputId: string): Promise<string>;
    sendSeed(seed: number): void;
    receiveSeed(): Promise<number>;
    synchronize(syncId: string): Promise<void>;
    confirmImpact(x: number, y: number): Promise<void>;
    set onTimeout(handler: () => void);
    close(): void;
}
