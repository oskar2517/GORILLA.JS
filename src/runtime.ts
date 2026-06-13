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
