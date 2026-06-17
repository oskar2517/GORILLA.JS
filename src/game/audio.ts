type NoteName = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type Accidental = "sharp" | "flat";
type NoteMode = "normal" | "legato" | "staccato";

type Token =
    | { kind: "length"; value: number }
    | { kind: "octave"; value: number }
    | { kind: "noteNumber"; value: number; dots: number }
    | { kind: "pause"; value: number; dots: number }
    | { kind: "tempo"; value: number }
    | { kind: "mode"; value: NoteMode }
    | { kind: "background"; value: boolean }
    | { kind: "octaveShift"; direction: "up" | "down" }
    | {
          kind: "note";
          name: NoteName;
          accidental?: Accidental;
          length?: number;
          dots: number;
      };

interface PlayState {
    octave: number;
    noteLength: number;
    tempo: number;
    noteMode: NoteMode;
}

const notes: Record<NoteName, number> = {
    A: 9,
    B: 11,
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
};

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext {
    audioContext ??= new AudioContext();
    return audioContext;
}

function wait(duration: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}

async function playNote(
    duration: number,
    frequency: number,
    volume: number,
): Promise<void> {
    const context = getAudioContext();
    await context.resume();

    return new Promise(resolve => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = frequency;
        gainNode.gain.value = volume;

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + duration / 1000);
        oscillator.addEventListener("ended", () => resolve(), { once: true });
    });
}

function noteFrequency(note: number): number {
    return 880.0 * Math.exp(Math.log(2.0) * (Math.floor(note) - 46) / 12.0);
}

function readTone(tone: string): Generator<Token> {
    return lexer(tone.toUpperCase());
}

function* lexer(tone: string): Generator<Token> {
    let index = 0;

    const peekChar = (): string => tone[index] ?? "\0";

    const nextChar = (): string => tone[index++] ?? "\0";

    const skipWhitespace = (): void => {
        while (/\s/.test(peekChar())) {
            index++;
        }
    };

    const matchChar = (char: string): boolean => {
        if (peekChar() !== char) {
            return false;
        }

        index++;
        return true;
    };

    const readNumber = (): number => {
        let number = "";

        while (/[0-9]/.test(peekChar())) {
            number += nextChar();
        }

        return Number.parseInt(number, 10) || 0;
    };

    const readDots = (): number => {
        let dots = 0;

        while (matchChar(".")) {
            dots++;
        }

        return dots;
    };

    while (index < tone.length) {
        skipWhitespace();
        if (index >= tone.length) {
            return;
        }

        const char = nextChar();

        switch (char) {
            case "L":
                yield { kind: "length", value: readNumber() };
                break;

            case "O":
                yield { kind: "octave", value: readNumber() };
                break;

            case "<":
                yield { kind: "octaveShift", direction: "down" };
                break;

            case ">":
                yield { kind: "octaveShift", direction: "up" };
                break;

            case "M": {
                const mode = nextChar();
                if (mode === "N") {
                    yield { kind: "mode", value: "normal" };
                } else if (mode === "L") {
                    yield { kind: "mode", value: "legato" };
                } else if (mode === "S") {
                    yield { kind: "mode", value: "staccato" };
                } else if (mode === "B") {
                    yield { kind: "background", value: true };
                } else if (mode === "F") {
                    yield { kind: "background", value: false };
                } else {
                    return;
                }
                break;
            }

            case "N":
                yield {
                    kind: "noteNumber",
                    value: readNumber(),
                    dots: readDots(),
                };
                break;

            case "P":
                yield {
                    kind: "pause",
                    value: readNumber(),
                    dots: readDots(),
                };
                break;

            case "T":
                yield { kind: "tempo", value: readNumber() };
                break;

            case "A":
            case "B":
            case "C":
            case "D":
            case "E":
            case "F":
            case "G": {
                let accidental: Accidental | undefined;
                let length: number | undefined;

                if (matchChar("#") || matchChar("+")) {
                    accidental = "sharp";
                } else if (matchChar("-")) {
                    accidental = "flat";
                }

                if (/[0-9]/.test(peekChar())) {
                    length = readNumber();
                }

                yield {
                    kind: "note",
                    name: char,
                    accidental,
                    length,
                    dots: readDots(),
                };
                break;
            }

            default:
                return;
        }
    }
}

function wholeNoteDuration(state: PlayState): number {
    return (60 * 1000 * 4) / state.tempo;
}

function applyDots(duration: number, dots: number): number {
    let result = duration;
    let extension = duration / 2;

    while (dots > 0) {
        result += extension;
        extension /= 2;
        dots--;
    }

    return result;
}

function restDuration(state: PlayState, length: number, dots: number): number {
    const restLength = length || 1;
    return applyDots(wholeNoteDuration(state) / restLength, dots);
}

function noteDuration(
    state: PlayState,
    length: number,
    dots: number,
): { sound: number; silence: number } {
    const noteLength = length || 1;
    let sound = wholeNoteDuration(state) / noteLength;
    let silence = 0;

    if (state.noteMode === "normal") {
        silence = sound / 8;
    } else if (state.noteMode === "staccato") {
        silence = sound / 4;
    }

    sound -= silence;
    sound = applyDots(sound, dots);

    return { sound, silence };
}

function noteFromName(state: PlayState, token: Extract<Token, { kind: "note" }>): number {
    let note = notes[token.name] + state.octave * 12 + 1;

    if (token.accidental === "sharp" && note < 84) {
        note++;
    } else if (token.accidental === "flat" && note > 1) {
        note--;
    }

    return note;
}

function shouldPlayInBackground(tokens: Iterable<Token>): boolean {
    let background = false;

    for (const token of tokens) {
        if (token.kind === "background") {
            background = token.value;
        }
    }

    return background;
}

async function playTokens(tokens: Iterable<Token>): Promise<void> {
    const state: PlayState = {
        octave: 4,
        noteLength: 4,
        tempo: 120,
        noteMode: "normal",
    };

    for (const token of tokens) {
        switch (token.kind) {
            case "length":
                if (token.value < 1) {
                    return;
                }
                state.noteLength = token.value;
                break;

            case "octave":
                state.octave = Math.min(token.value, 6);
                break;

            case "octaveShift":
                if (token.direction === "up") {
                    state.octave = Math.min(state.octave + 1, 6);
                } else {
                    state.octave = Math.max(state.octave - 1, 0);
                }
                break;

            case "mode":
                state.noteMode = token.value;
                break;

            case "background":
                break;

            case "tempo":
                if (token.value < 32 || token.value > 255) {
                    return;
                }
                state.tempo = token.value;
                break;

            case "pause":
                await wait(restDuration(state, token.value, token.dots));
                break;

            case "noteNumber":
                if (token.value < 0 || token.value > 84) {
                    return;
                }

                if (token.value === 0) {
                    await wait(restDuration(state, state.noteLength, token.dots));
                    break;
                }

                await playToneNote(state, token.value, state.noteLength, token.dots);
                break;

            case "note":
                await playToneNote(
                    state,
                    noteFromName(state, token),
                    token.length ?? state.noteLength,
                    token.dots,
                );
                break;
        }
    }
}

async function playToneNote(
    state: PlayState,
    note: number,
    length: number,
    dots: number,
): Promise<void> {
    const duration = noteDuration(state, length, dots);
    await playNote(duration.sound, noteFrequency(note), 0.1);

    if (duration.silence > 0) {
        await wait(duration.silence);
    }
}

export function playTone(tone: string): Promise<void> {
    const tokens = [...readTone(tone)];
    const background = shouldPlayInBackground(tokens);
    const playback = playTokens(tokens);

    if (background) {
        playback.catch(cause => console.error(cause));
        return Promise.resolve();
    }

    return playback;
}
