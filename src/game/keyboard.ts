import { mount, unmount } from "svelte";
import type { OnscreenKeyboardLayout } from "../lib/OnscreenKeyboard.svelte";
import OnscreenKeyboard from "../lib/OnscreenKeyboard.svelte";
import type { MultiplayerSession } from "./types";

interface KeyReader {
    readKey(): Promise<string>;
    destroy(): void;
}

export function shouldUseOnscreenKeyboard(): boolean {
    return window.matchMedia("(pointer: coarse)").matches;
}

export function readBrowserKey(): Promise<string> {
    return new Promise(resolve => {
        window.addEventListener("keydown", event => {
            resolve(event.key);
        }, { once: true });
    });
}

function createOnscreenKeyReader(
    onscreenLayout: OnscreenKeyboardLayout,
): KeyReader {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const queue: string[] = [];
    const waiters: Array<(key: string) => void> = [];

    const keyboard = mount(OnscreenKeyboard, {
        target,
        props: {
            layout: onscreenLayout,
            onkey(key: string): void {
                const waiter = waiters.shift();
                if (waiter) {
                    waiter(key);
                } else {
                    queue.push(key);
                }
            },
        },
    });

    return {
        readKey(): Promise<string> {
            const key = queue.shift();
            if (key !== undefined) {
                return Promise.resolve(key);
            }

            return new Promise(resolve => {
                waiters.push(resolve);
            });
        },
        async destroy(): Promise<void> {
            await unmount(keyboard);
            target.remove();
        },
    };
}

export function createKeyReader(onscreenLayout: OnscreenKeyboardLayout): KeyReader {
    if (!shouldUseOnscreenKeyboard()) {
        return {
            readKey: readBrowserKey,
            destroy(): void { },
        };
    }

    const onscreenKeyReader = createOnscreenKeyReader(onscreenLayout);

    return {
        readKey(): Promise<string> {
            return Promise.race([
                readBrowserKey(),
                onscreenKeyReader.readKey(),
            ]);
        },
        destroy(): void {
            onscreenKeyReader.destroy();
        },
    };
}

async function readAnyKey(onscreenLayout: OnscreenKeyboardLayout): Promise<string> {
    const keyReader = createKeyReader(onscreenLayout);
    try {
        return await keyReader.readKey();
    } finally {
        keyReader.destroy();
    }
}

export async function readSynchronizedKey(
    session: MultiplayerSession | undefined,
    inputId: string,
    owner: 0 | 1,
    onscreenLayout: OnscreenKeyboardLayout,
    keyReader?: KeyReader,
): Promise<string> {
    if (!session) {
        return keyReader ? keyReader.readKey() : readAnyKey(onscreenLayout);
    }

    if (session.localPlayer === owner) {
        const key = keyReader
            ? await keyReader.readKey()
            : await readAnyKey(onscreenLayout);
        session.sendKey(inputId, key);
        return key;
    }

    return session.receiveKey(inputId);
}
