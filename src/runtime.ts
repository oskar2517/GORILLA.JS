import { COLOR_BLACK, COLOR_WHITE } from "./constants";
import { drawText } from "./graphics";

export async function loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
}

export function readBrowserKey(): Promise<string> {
    return new Promise(resolve => {
        window.addEventListener("keydown", event => {
            resolve(event.key);
        }, { once: true });
    });
}

export function readInput(
    ctx: CanvasRenderingContext2D,
    column: number,
    row: number,
    prompt: string,
    foregroundColor = COLOR_WHITE,
    backgroundColor = COLOR_BLACK,
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
            window.removeEventListener("keydown", handleKey);
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

        const handleKey = (event: KeyboardEvent): void => {
            if (event.key.length === 1) {
                result += event.key;
            } else if (event.key === "Backspace" && result.length > 0) {
                event.preventDefault();
                result = result.substring(0, result.length - 1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                finish();
                return;
            } else {
                return;
            }

            cursorVisible = true;
            draw();
        };

        const cursorTimer = window.setInterval(() => {
            cursorVisible = !cursorVisible;
            draw();
        }, 100);

        window.addEventListener("keydown", handleKey);
        draw();
    });
}

/**
 * NOTE: The original game measures CPU speed and then waits in a
 * busy loop.
 */
export function rest(seconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, Math.max(seconds * 1000, 16));
    });
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

        let firstFrameTime: number | undefined;
        let nextStep = 0;

        const drawFrame = (frameTime: number): void => {
            firstFrameTime ??= frameTime;

            const elapsed = frameTime - firstFrameTime;
            const targetStep = Math.min(
                totalSteps,
                Math.floor(elapsed / durationMs * totalSteps) + 1,
            );

            while (nextStep < targetStep) {
                drawStep(nextStep);
                nextStep++;
            }

            if (nextStep < totalSteps) {
                requestAnimationFrame(drawFrame);
            } else {
                resolve();
            }
        };

        requestAnimationFrame(drawFrame);
    });
}

export function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
