import type { CPUDifficulty } from "../lib/game-session";
import { calculateThrow, type Throw } from "./cpu";
import { createKeyReader } from "./keyboard";
import { waitFor } from "./runtime";
import type {
    InputRequest,
    MultiplayerSession,
    Player,
    Players,
} from "./types";

const CPU_KEY_DELAY = 0.1;

function createRandomSeed(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function createLocalPlayer(session?: MultiplayerSession): Player {
    return {
        async synchronize(syncId): Promise<void> {
            await session?.synchronize(syncId);
        },
        async confirmImpact(x, y): Promise<void> {
            await session?.confirmImpact(x, y);
        },
        beginInput(request) {
            const keyReader = createKeyReader(request.onscreenKeyboardLayout);

            return {
                async readKey(): Promise<string> {
                    const key = await keyReader.readKey();
                    session?.sendKey(request.id, key);
                    return key;
                },
                destroy(): void {
                    keyReader.destroy();
                },
            };
        },
        async readSeed(): Promise<number> {
            const seed = createRandomSeed();
            session?.sendSeed(seed);
            return seed;
        },
    };
}

export function createRemotePlayer(session: MultiplayerSession): Player {
    return {
        synchronize(syncId): Promise<void> {
            return session.synchronize(syncId);
        },
        confirmImpact(x, y): Promise<void> {
            return session.confirmImpact(x, y);
        },
        beginInput(request) {
            return {
                readKey(): Promise<string> {
                    return session.receiveKey(request.id);
                },
                destroy(): void { },
            };
        },
        readSeed(): Promise<number> {
            return session.receiveSeed();
        },
    };
}

export function createCpuPlayer(difficulty: CPUDifficulty): Player {
    let plannedThrow: Throw;

    return {
        async synchronize(): Promise<void> { },
        async confirmImpact(): Promise<void> { },
        beginInput({ intent }) {
            let value: number;

            switch (intent.kind) {
                case "angle":
                    plannedThrow = calculateThrow(
                        intent.state,
                        intent.playerNumber,
                        difficulty
                    );
                    value = plannedThrow.angle;
                    
                    break;
                case "velocity":
                    value = plannedThrow.velocity;

                    break;
                default:
                    throw new Error(`Requested CPU player intent ${intent.kind} unsupported`);
            }

            const keys = [...value.toString(), "Enter"];

            return {
                async readKey(): Promise<string> {
                    await waitFor(CPU_KEY_DELAY);
                    const key = keys.shift();
                    if (key === undefined) {
                        throw new Error("CPU player has no more keys");
                    }
                    return key;
                },
                destroy(): void { },
            };
        },
        async readSeed(): Promise<number> {
            return createRandomSeed();
        },
    };
}

export function createOfflinePlayers(): Players {
    return [createLocalPlayer(), createLocalPlayer()];
}

export function createCpuGamePlayers(difficulty: CPUDifficulty): Players {
    return [createLocalPlayer(), createCpuPlayer(difficulty)];
}

export function createOnlinePlayers(session: MultiplayerSession): Players {
    const localPlayer = createLocalPlayer(session);
    const remotePlayer = createRemotePlayer(session);

    return session.localPlayer === 0
        ? [localPlayer, remotePlayer]
        : [remotePlayer, localPlayer];
}

export async function readPlayerKey(
    player: Player,
    request: InputRequest,
): Promise<string> {
    const input = player.beginInput(request);
    try {
        return await input.readKey();
    } finally {
        input.destroy();
    }
}
