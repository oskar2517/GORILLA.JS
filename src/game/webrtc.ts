import P2PCF from "p2pcf";
import type { MultiplayerSession } from "./types";

const SIGNALING_WORKER_URL = "https://signaling.gorillas.zone";
const ROOM_PREFIX = "gorillas-";
const STUN_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
];

interface KeyMessage {
    type: "key";
    inputId: string;
    key: string;
}

interface SeedMessage {
    type: "seed";
    seed: number;
}

interface ReadyMessage {
    type: "ready";
    syncId: string;
}

type Message = KeyMessage | SeedMessage | ReadyMessage;

interface P2PCFPeer {
    id: string;
    client_id: string;
    connected: boolean;
}

interface P2PCFClient {
    on(event: "peerconnect", listener: (peer: P2PCFPeer) => void): void;
    on(
        event: "msg",
        listener: (peer: P2PCFPeer, data: ArrayBuffer) => void,
    ): void;
    on(event: "peerclose", listener: (peer: P2PCFPeer) => void): void;
    start(): Promise<void>;
    send(peer: P2PCFPeer, message: Uint8Array): void;
    destroy(): void;
}

export interface HostConnection {
    roomCode: string;
    session: Promise<MultiplayerSession>;
    close(): void;
}

export interface JoinConnection {
    session: Promise<MultiplayerSession>;
    close(): void;
}

function createClientId(role: "host" | "join"): string {
    return `${role}-${crypto.randomUUID()}`;
}

function createRoomCode(): string {
    return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}

function createRoomId(roomCode: string): string {
    return `${ROOM_PREFIX}${roomCode}`;
}

function createP2PCFClient(role: "host" | "join", roomCode: string): P2PCFClient {
    return new P2PCF(createClientId(role), createRoomId(roomCode), {
        workerUrl: SIGNALING_WORKER_URL,
        stunIceServers: STUN_ICE_SERVERS,
        turnIceServers: STUN_ICE_SERVERS,
        idlePollingAfterMs: 10 * 60 * 1000,
        slowPollingRateMs: 1000,
    }) as P2PCFClient;
}

function createSession(
    client: P2PCFClient,
    peer: P2PCFPeer,
    localPlayer: 0 | 1,
): MultiplayerSession {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const inbox: Message[] = [];
    const waiters: Array<{
        matches: (message: Message) => boolean;
        resolve: (message: Message) => void;
    }> = [];

    client.on("msg", (sender, data) => {
        if (sender.id !== peer.id) {
            return;
        }

        const message = JSON.parse(decoder.decode(data)) as Message;
        const index = waiters.findIndex(waiter => waiter.matches(message));

        if (index >= 0) {
            waiters.splice(index, 1)[0].resolve(message);
        } else {
            inbox.push(message);
        }
    });

    const send = (message: Message): void => {
        client.send(peer, encoder.encode(JSON.stringify(message)));
    };

    const receive = (
        matches: (message: Message) => boolean,
    ): Promise<Message> => {
        const index = inbox.findIndex(matches);
        if (index >= 0) {
            return Promise.resolve(inbox.splice(index, 1)[0]);
        }

        return new Promise(resolve => {
            waiters.push({ matches, resolve });
        });
    };

    return {
        localPlayer,
        isHost: localPlayer === 0,
        sendKey(inputId, key): void {
            send({ type: "key", inputId, key });
        },
        async receiveKey(inputId): Promise<string> {
            const message = await receive(
                value => value.type === "key" && value.inputId === inputId,
            );
            return (message as KeyMessage).key;
        },
        sendSeed(seed): void {
            send({ type: "seed", seed });
        },
        async receiveSeed(): Promise<number> {
            const message = await receive(value => value.type === "seed");
            return (message as SeedMessage).seed;
        },
        async synchronize(syncId): Promise<void> {
            send({ type: "ready", syncId });
            await receive(
                value => value.type === "ready" && value.syncId === syncId,
            );
        },
        close(): void {
            client.destroy();
        },
    };
}

function waitForSession(
    client: P2PCFClient,
    localPlayer: 0 | 1,
    remoteRole: "host" | "join",
): Promise<MultiplayerSession> {
    return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (): boolean => {
            if (settled) {
                return false;
            }

            settled = true;
            return true;
        };

        const finishResolve = (session: MultiplayerSession): void => {
            if (finish()) {
                resolve(session);
            }
        };

        const finishReject = (cause: unknown): void => {
            if (finish()) {
                reject(cause);
            }
        };

        client.on("peerconnect", peer => {
            if (settled || !peer.client_id.startsWith(`${remoteRole}-`)) {
                return;
            }

            finishResolve(createSession(client, peer, localPlayer));
        });

        client.on("peerclose", peer => {
            if (settled || !peer.client_id.startsWith(`${remoteRole}-`)) {
                return;
            }

            finishReject(
                new Error("The WebRTC peer closed before connecting"),
            );
        });

        client.start().catch(cause => {
            finishReject(
                cause instanceof Error ? cause : new Error(String(cause)),
            );
        });
    });
}

export function createHostConnection(): HostConnection {
    const roomCode = createRoomCode();
    const client = createP2PCFClient("host", roomCode);
    const session = waitForSession(client, 0, "join").catch(cause => {
        client.destroy();
        throw cause;
    });

    return {
        roomCode,
        session,
        close(): void {
            client.destroy();
        },
    };
}

export function createJoinConnection(roomCode: string): JoinConnection {
    const normalizedRoomCode = roomCode.trim();
    const client = createP2PCFClient("join", normalizedRoomCode);
    const session = waitForSession(client, 1, "host").catch(cause => {
        client.destroy();
        throw cause;
    });

    return {
        session,
        close(): void {
            client.destroy();
        },
    };
}
