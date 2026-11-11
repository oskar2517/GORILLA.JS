import { mount, unmount } from "svelte";
import type { OnscreenKeyboardLayout } from "../lib/OnscreenKeyboard.svelte";
import OnscreenKeyboard from "../lib/OnscreenKeyboard.svelte";
import type { InputReader } from "./types";

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
): InputReader {
    const target = document.createElement("div");
    // NOTE: This is an ugly fix.
    const wrapperElement = document.querySelector("#gameWrapper");
    if (!wrapperElement) {
        throw new Error("Could not find game wrapper element");
    }
    wrapperElement.appendChild(target);
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

export function createKeyReader(onscreenLayout: OnscreenKeyboardLayout): InputReader {
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
