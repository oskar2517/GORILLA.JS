import { mount, unmount } from "svelte";
import type { OnscreenKeyboardLayout } from "../lib/OnscreenKeyboard.svelte";
import OnscreenKeyboard from "../lib/OnscreenKeyboard.svelte";
import type { MultiplayerSession } from "./types";

export function shouldUseOnscreenKeyboard(): boolean {
    return true;
    return window.matchMedia("(pointer: coarse)").matches;
}

export function readBrowserKey(): Promise<string> {
    return new Promise(resolve => {
        window.addEventListener("keydown", event => {
            resolve(event.key);
        }, { once: true });
    });
}

export function readOnscreenKey(onscreenLayout: OnscreenKeyboardLayout): Promise<string> {
    const target = document.createElement("div");
    document.body.appendChild(target);

    return new Promise(resolve => {
        const keyboard = mount(OnscreenKeyboard, {
            target,
            props: {
                layout: onscreenLayout,
                onkey(key: string): void {
                    resolve(key);
                    unmount(keyboard).then(() => {
                        target.remove();
                    });
                },
            },
        });
    });
}

function readAnyKey(onscreenLayout: OnscreenKeyboardLayout): Promise<string> {
    if (!shouldUseOnscreenKeyboard()) {
        return readBrowserKey();
    }

    return Promise.race([
        readBrowserKey(),
        readOnscreenKey(onscreenLayout),
    ]);
}

export async function readSynchronizedKey(
    session: MultiplayerSession | undefined,
    inputId: string,
    owner: 0 | 1,
    onscreenLayout: OnscreenKeyboardLayout,
): Promise<string> {
    if (!session) {
        return readAnyKey(onscreenLayout);
    }

    if (session.localPlayer === owner) {
        const key = await readAnyKey(onscreenLayout);
        session.sendKey(inputId, key);
        return key;
    }

    return session.receiveKey(inputId);
}
