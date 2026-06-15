import { writable } from "svelte/store";
import type { MultiplayerSession } from "../game/types";

export type GameLaunch =
    | { mode: "local" }
    | { mode: "online"; session: MultiplayerSession };

export const gameLaunch = writable<GameLaunch | undefined>(undefined);
