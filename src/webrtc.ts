import type { MultiplayerSession } from "./types";

type Message =
    | { type: "key"; inputId: string; key: string }
    | { type: "seed"; seed: number }
    | { type: "ready"; syncId: string };

function waitForIce(peer: RTCPeerConnection): Promise<void> {
    return new Promise(resolve => {
        peer.addEventListener("icecandidate", event => {
            if (!event.candidate) resolve();
        });
    });
}

async function createDescription(
    peer: RTCPeerConnection,
    description: RTCSessionDescriptionInit,
    output: HTMLTextAreaElement,
): Promise<void> {
    const iceComplete = waitForIce(peer);
    await peer.setLocalDescription(description);
    await iceComplete;
    output.value = JSON.stringify(peer.localDescription);
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

    channel.onmessage = event => {
        const message = JSON.parse(String(event.data)) as Message;
        const index = waiters.findIndex(waiter => waiter.matches(message));

        if (index >= 0) {
            waiters.splice(index, 1)[0].resolve(message);
        } else {
            inbox.push(message);
        }
    };

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

export async function chooseMultiplayerSession(): Promise<
    MultiplayerSession | undefined
> {
    const multiplayerControls: HTMLDivElement = document.querySelector("#app")!!;

    const localGame = document.createElement("button");
    const createOffer = document.createElement("button");
    const createAnswer = document.createElement("button");
    const acceptAnswer = document.createElement("button");
    const local = document.createElement("textarea");
    const remote = document.createElement("textarea");
    const status = document.createElement("p");

    localGame.textContent = "Local game";
    createOffer.textContent = "Create offer";
    createAnswer.textContent = "Create answer";
    acceptAnswer.textContent = "Accept answer";
    local.readOnly = true;
    local.placeholder = "Local";
    remote.placeholder = "Remote";

    const elements = [
        localGame,
        createOffer,
        createAnswer,
        acceptAnswer,
        local,
        remote,
        status,
    ];
    multiplayerControls.append(...elements);

    const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    let resolveChoice: (player: 0 | 1 | undefined) => void;
    const choice = new Promise<0 | 1 | undefined>(resolve => {
        resolveChoice = resolve;
    });

    let resolveChannel: (channel: RTCDataChannel) => void;
    const channelReady = new Promise<RTCDataChannel>(resolve => {
        resolveChannel = resolve;
    });

    peer.ondatachannel = event => resolveChannel(event.channel);
    peer.onconnectionstatechange = () => {
        status.textContent = peer.connectionState;
    };

    localGame.onclick = () => resolveChoice(undefined);
    createOffer.onclick = async () => {
        const channel = peer.createDataChannel("gorillas");
        resolveChannel(channel);
        await createDescription(peer, await peer.createOffer(), local);
        resolveChoice(0);
    };
    createAnswer.onclick = async () => {
        await peer.setRemoteDescription(JSON.parse(remote.value));
        await createDescription(peer, await peer.createAnswer(), local);
        resolveChoice(1);
    };
    acceptAnswer.onclick = async () => {
        await peer.setRemoteDescription(JSON.parse(remote.value));
    };

    const player = await choice;
    if (player === undefined) {
        peer.close();
        elements.forEach(element => element.remove());
        return undefined;
    }

    const channel = await channelReady;
    if (channel.readyState !== "open") {
        await new Promise<void>(resolve => {
            channel.onopen = () => resolve();
        });
    }

    elements.forEach(element => element.remove());
    return createSession(peer, channel, player);
}
