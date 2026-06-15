import type { MultiplayerSession } from "./types";

type Message =
    | { type: "key"; inputId: string; key: string }
    | { type: "seed"; seed: number }
    | { type: "ready"; syncId: string };

export interface HostConnection {
    offer: string;
    acceptAnswer(answer: string): Promise<MultiplayerSession>;
    close(): void;
}

export interface JoinConnection {
    answer: string;
    session: Promise<MultiplayerSession>;
    close(): void;
}

function encodeDescription(description: RTCSessionDescription | null): string {
    return btoa(JSON.stringify(description));
}

function decodeDescription(value: string): RTCSessionDescriptionInit {
    return JSON.parse(atob(value.trim())) as RTCSessionDescriptionInit;
}

function waitForIce(peer: RTCPeerConnection): Promise<void> {
    if (peer.iceGatheringState === "complete") {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const handleCandidate = (event: RTCPeerConnectionIceEvent): void => {
            if (!event.candidate) {
                peer.removeEventListener("icecandidate", handleCandidate);
                resolve();
            }
        };

        peer.addEventListener("icecandidate", handleCandidate);
    });
}

async function setLocalDescription(
    peer: RTCPeerConnection,
    description: RTCSessionDescriptionInit,
): Promise<string> {
    const iceComplete = waitForIce(peer);
    await peer.setLocalDescription(description);
    await iceComplete;
    return encodeDescription(peer.localDescription);
}

function waitForChannel(channel: RTCDataChannel): Promise<void> {
    if (channel.readyState === "open") {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const handleOpen = (): void => {
            cleanup();
            resolve();
        };
        const handleClose = (): void => {
            cleanup();
            reject(new Error("The WebRTC data channel closed"));
        };
        const cleanup = (): void => {
            channel.removeEventListener("open", handleOpen);
            channel.removeEventListener("close", handleClose);
        };

        channel.addEventListener("open", handleOpen);
        channel.addEventListener("close", handleClose);
    });
}

function receiveDataChannel(peer: RTCPeerConnection): Promise<RTCDataChannel> {
    return new Promise(resolve => {
        peer.addEventListener(
            "datachannel",
            event => resolve(event.channel),
            { once: true },
        );
    });
}

function createPeer(): RTCPeerConnection {
    return new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
}

function createSession(
    peer: RTCPeerConnection,
    channel: RTCDataChannel,
    localPlayer: 0 | 1,
): MultiplayerSession {
    const inbox: Message[] = [];
    const waiters: Array<{
        matches: (message: Message) => boolean;
        resolve: (message: Message) => void;
    }> = [];

    channel.addEventListener("message", event => {
        const message = JSON.parse(String(event.data)) as Message;
        const index = waiters.findIndex(waiter => waiter.matches(message));

        if (index >= 0) {
            waiters.splice(index, 1)[0].resolve(message);
        } else {
            inbox.push(message);
        }
    });

    const send = (message: Message): void => {
        channel.send(JSON.stringify(message));
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
            return (message as Extract<Message, { type: "key" }>).key;
        },
        sendSeed(seed): void {
            send({ type: "seed", seed });
        },
        async receiveSeed(): Promise<number> {
            const message = await receive(value => value.type === "seed");
            return (message as Extract<Message, { type: "seed" }>).seed;
        },
        async synchronize(syncId): Promise<void> {
            send({ type: "ready", syncId });
            await receive(
                value => value.type === "ready" && value.syncId === syncId,
            );
        },
        close(): void {
            channel.close();
            peer.close();
        },
    };
}

export async function createHostConnection(): Promise<HostConnection> {
    const peer = createPeer();
    const channel = peer.createDataChannel("gorillas");
    const offer = await setLocalDescription(peer, await peer.createOffer());
    let answerAccepted = false;

    return {
        offer,
        async acceptAnswer(answer: string): Promise<MultiplayerSession> {
            if (answerAccepted) {
                throw new Error("The answer has already been accepted");
            }
            answerAccepted = true;

            await peer.setRemoteDescription(decodeDescription(answer));
            await waitForChannel(channel);
            return createSession(peer, channel, 0);
        },
        close(): void {
            channel.close();
            peer.close();
        },
    };
}

export async function createJoinConnection(
    offer: string,
): Promise<JoinConnection> {
    const peer = createPeer();
    const channelReceived = receiveDataChannel(peer);

    await peer.setRemoteDescription(decodeDescription(offer));
    const answer = await setLocalDescription(peer, await peer.createAnswer());

    const session = (async (): Promise<MultiplayerSession> => {
        const channel = await channelReceived;
        await waitForChannel(channel);
        return createSession(peer, channel, 1);
    })();

    return {
        answer,
        session,
        close(): void {
            peer.close();
        },
    };
}
