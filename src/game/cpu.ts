import type { CPUDifficulty } from "../lib/game-session";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";
import { qbasicRound } from "./runtime";
import type { Building, GameState, Gorilla } from "./types";

const GORILLA_SIZE = 30;

const MIN_ANGLE = 1;
const MAX_ANGLE = 89;

const MIN_VELOCITY = 2;
const MAX_VELOCITY = 200;

const FALLBACK_THROW: Throw = { angle: 45, velocity: 50 };

export interface Throw {
    angle: number;
    velocity: number;
}

function isInsideGorilla(gorilla: Gorilla, x: number, y: number): boolean {
    return x >= gorilla.x && x < gorilla.x + GORILLA_SIZE
        && y >= gorilla.y && y < gorilla.y + GORILLA_SIZE;
}

function isInsideBuilding(buildings: Building[], x: number, y: number): boolean {
    return buildings.some(building =>
        x >= building.x && x <= building.x + building.width
        && y >= building.y && y <= building.y + building.height
    );
}

function testThrowCandidate(
    state: GameState,
    playerNumber: 0 | 1,
    candidate: Throw,
): boolean {
    const player = state.players[playerNumber];
    const opponent = state.players[1 - playerNumber];

    const angleDegrees = playerNumber === 1
        ? 180 - candidate.angle
        : candidate.angle;
    const angle = angleDegrees / 180 * Math.PI;
    const initialXVelocity = Math.cos(angle) * candidate.velocity;
    const initialYVelocity = Math.sin(angle) * candidate.velocity;

    const adjustment = 4;
    let startXPosition = player.x;
    const startYPosition = player.y - adjustment - 3;
    const collisionSampleDirection = playerNumber === 1 ? 4 : -4;

    if (playerNumber === 1) {
        startXPosition += 25;
    }

    /**
     * NOTE: Gravity is always positive, so the banana eventually leaves the
     * screen at the bottom and this loop terminates.
     */
    for (let time = 0; ; time += 0.1) {
        const x = startXPosition
            + initialXVelocity * time
            + 0.5 * (state.wind / 5) * time * time;
        const y = startYPosition
            + (-initialYVelocity * time
                + 0.5 * state.gravity * time * time)
            * (SCREEN_HEIGHT / 350);

        if (x >= SCREEN_WIDTH - 10 || x <= 3 || y >= SCREEN_HEIGHT - 3) {
            return false;
        }

        if (y <= 0) {
            continue;
        }

        let sampleY = 0;
        let sampleX = 8 * (1 - playerNumber);

        do {
            // NOTE: Same rounding as getPixelAt.
            const pixelX = qbasicRound(x + sampleX);
            const pixelY = qbasicRound(y + sampleY);

            if (isInsideGorilla(opponent, pixelX, pixelY)) {
                return true;
            }
            if (isInsideGorilla(player, pixelX, pixelY) || isInsideBuilding(state.buildings, pixelX, pixelY)) {
                return false;
            }

            sampleX += collisionSampleDirection;
            sampleY += 6;
        } while (sampleX === 4);
    }
}

/**
 * Maximum error per difficulty. Angle error in degrees,
 * velocity error in percent.
 */
const THROW_ERRORS: Record<CPUDifficulty, Throw> = {
    Easy: { angle: 6, velocity: 0.12 },
    Medium: { angle: 4, velocity: 0.06 },
    Hard: { angle: 2, velocity: 0.03 },
    Impossible: { angle: 0, velocity: 0 },
};

/**
 * Produces random error between -maximum and +maximum.
 */
function randomError(maximum: number): number {
    return (Math.random() * 2 - 1) * maximum;
}

function scaleWithError(candidate: Throw, difficulty: CPUDifficulty): Throw {
    const error = THROW_ERRORS[difficulty];

    const angle = Math.round(candidate.angle + randomError(error.angle));
    const velocity = Math.round(
        candidate.velocity * (1 + randomError(error.velocity)),
    );

    return {
        angle: Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle)),
        velocity: Math.max(MIN_VELOCITY, velocity),
    };
}

/**
 * Centers a throw candidate within the range of possible velocity values.
 * Otherwise, even tiny errors might cause it to no longer connect.
 */
function centerThrow(
    state: GameState,
    playerNumber: 0 | 1,
    candidate: Throw,
): Throw {
    let maxVelocity = candidate.velocity;

    while (
        maxVelocity < MAX_VELOCITY
        && testThrowCandidate(state, playerNumber, {
            angle: candidate.angle,
            velocity: maxVelocity + 1,
        })
    ) {
        maxVelocity++;
    }

    return {
        angle: candidate.angle,
        velocity: Math.round((candidate.velocity + maxVelocity) / 2),
    };
}

export function calculateThrow(
    state: GameState,
    playerNumber: 0 | 1,
    difficulty: CPUDifficulty
): Throw {
    for (let velocity = MIN_VELOCITY; velocity <= MAX_VELOCITY; velocity++) {
        for (let angle = MIN_ANGLE; angle <= MAX_ANGLE; angle++) {
            const candidate = { angle, velocity };
            if (testThrowCandidate(state, playerNumber, candidate)) {
                const centeredCandidate = centerThrow(state, playerNumber, candidate);

                return scaleWithError(centeredCandidate, difficulty);
            }
        }
    }

    return FALLBACK_THROW;
}
