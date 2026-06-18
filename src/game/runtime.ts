import { mount, unmount } from "svelte";
import { COLOR_BLACK, COLOR_WHITE } from "./constants";
import { drawText } from "./graphics";
import OnscreenKeyboard, { type OnscreenKeyboardLayout } from "../lib/OnscreenKeyboard.svelte";
import type { MultiplayerSession } from "./types";

let randomState: number | undefined;

export async function loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
}

function shouldUseOnscreenKeyboard(): boolean {
    return true;
    return (
        window.matchMedia("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0
    );
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

export function readInput(
    ctx: CanvasRenderingContext2D,
    column: number,
    row: number,
    prompt: string,
    foregroundColor = COLOR_WHITE,
    backgroundColor = COLOR_BLACK,
    readKey: () => Promise<string> = readBrowserKey,
): Promise<string> {
    return new Promise(resolve => {
        let result = "";
        let cursorVisible = true;

        const draw = (): void => {
            const cursor = cursorVisible ? "_" : " ";
            drawText(
                ctx,
                column,
                row,
                `${prompt}${result}${cursor} `,
                foregroundColor,
                backgroundColor,
            );
        };

        const finish = (): void => {
            window.clearInterval(cursorTimer);
            drawText(
                ctx,
                column,
                row,
                `${prompt}${result}  `,
                foregroundColor,
                backgroundColor,
            );
            resolve(result);
        };

        const handleKey = (key: string): boolean => {
            if (key.length === 1) {
                result += key;
            } else if (key === "Backspace" && result.length > 0) {
                result = result.substring(0, result.length - 1);
            } else if (key === "Enter") {
                return true;
            } else {
                return false;
            }

            cursorVisible = true;
            draw();
            return false;
        };

        const readKeys = async (): Promise<void> => {
            while (true) {
                const key = await readKey();
                if (handleKey(key)) {
                    finish();
                    return;
                }
            }
        };

        const cursorTimer = window.setInterval(() => {
            cursorVisible = !cursorVisible;
            draw();
        }, 100);

        draw();
        void readKeys();
    });
}

function waitUntil(deadline: number): Promise<void> {
    return new Promise(resolve => {
        const checkTime = (): void => {
            const remaining = deadline - performance.now();
            if (remaining <= 0) {
                resolve();
            } else {
                window.setTimeout(checkTime, remaining);
            }
        };

        checkTime();
    });
}

export interface Timeline {
    wait(seconds: number): Promise<void>;
}

/**
 * NOTE: The original game measures CPU speed and then waits in a
 * busy loop.
 */
export function createTimeline(): Timeline {
    let deadline = performance.now();

    return {
        wait(seconds: number): Promise<void> {
            deadline += seconds * 1000;
            return waitUntil(deadline);
        },
    };
}

export function waitFor(seconds: number): Promise<void> {
    return waitUntil(performance.now() + seconds * 1000);
}

export function animateSteps(
    stepCount: number,
    durationSeconds: number,
    drawStep: (step: number) => void,
): Promise<void> {
    const totalSteps = Math.max(0, Math.floor(stepCount));
    const durationMs = durationSeconds * 1000;

    return new Promise(resolve => {
        if (totalSteps === 0) {
            resolve();
            return;
        }
        if (totalSteps === 1 || durationMs <= 0) {
            for (let step = 0; step < totalSteps; step++) {
                drawStep(step);
            }
            resolve();
            return;
        }

        const startTime = performance.now();
        let nextStep = 1;
        drawStep(0);

        const drawFrame = (frameTime: number): void => {
            const elapsed = frameTime - startTime;
            const targetStep = Math.min(
                totalSteps - 1,
                Math.floor(elapsed / durationMs * (totalSteps - 1)),
            );

            while (nextStep <= targetStep) {
                drawStep(nextStep);
                nextStep++;
            }

            if (elapsed < durationMs) {
                requestAnimationFrame(drawFrame);
            } else {
                while (nextStep < totalSteps) {
                    drawStep(nextStep);
                    nextStep++;
                }
                resolve();
            }
        };

        requestAnimationFrame(drawFrame);
    });
}

export function randomNumber(min: number, max: number): number {
    let randomValue: number;

    if (randomState === undefined) {
        randomValue = Math.random();
    } else {
        randomState = (randomState + 0x6D2B79F5) >>> 0;
        let value = randomState;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        randomValue = ((value ^ value >>> 14) >>> 0) / 4294967296;
    }

    return Math.floor(randomValue * (max - min + 1)) + min;
}

export function setRandomSeed(seed: number | undefined): void {
    randomState = seed === undefined ? undefined : seed >>> 0;
}

/**
 * QBASIC's CINT conversion rounds exact halves to the nearest even integer.
 */
export function qbasicRound(value: number): number {
    const lower = Math.floor(value);
    const fraction = value - lower;

    if (fraction === 0.5) {
        return lower % 2 === 0 ? lower : lower + 1;
    }

    return Math.round(value);
}
