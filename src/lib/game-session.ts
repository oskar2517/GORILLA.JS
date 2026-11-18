import { writable } from "svelte/store";
import type { MultiplayerSession } from "../game/types";

export const CPU_DIFFICULTIES = ["Easy", "Medium", "Hard", "Impossible"] as const;

export type CPUDifficulty = typeof CPU_DIFFICULTIES[number];

export type GameLaunch =
    | { mode: "local" }
    | { mode: "cpu", difficulty: CPUDifficulty }
    | { mode: "online"; session: MultiplayerSession };

export const gameLaunch = writable<GameLaunch | undefined>(undefined);
