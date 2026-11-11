import { createKeyReader } from "./keyboard";
import type {
    InputRequest,
    MultiplayerSession,
    Player,
    Players,
} from "./types";

function createRandomSeed(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0];
}

/**
 * A player at this device. In online games, every key the player enters is
 * sent to the remote peer.
 */
export function createLocalPlayer(session?: MultiplayerSession): Player {
    return {
        async synchronize(): Promise<void> { },
        async confirmImpact(): Promise<void> { },
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

/**
 * A player at the other end of an online session. Receives the inputs sent by
 * the peer's local player and keeps both peers synchronized.
 */
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

export function createOfflinePlayers(): Players {
    return [createLocalPlayer(), createLocalPlayer()];
}

export function createOnlinePlayers(session: MultiplayerSession): Players {
    const localPlayer = createLocalPlayer(session);
    const remotePlayer = createRemotePlayer(session);

    return session.localPlayer === 0
        ? [localPlayer, remotePlayer]
        : [remotePlayer, localPlayer];
}

export async function synchronizePlayers(
    players: Players,
    syncId: string,
): Promise<void> {
    await Promise.all(players.map(player => player.synchronize(syncId)));
}

export async function confirmPlayerImpact(
    players: Players,
    x: number,
    y: number,
): Promise<void> {
    await Promise.all(players.map(player => player.confirmImpact(x, y)));
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
