<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import { gameLaunch } from "../lib/game-session";
    import { runGame } from "../game/main";
    import type { MultiplayerSession } from "../game/types";
    import { shouldUseOnscreenKeyboard } from "../game/keyboard";

    const { push } = useNavigate();

    let canvas: HTMLCanvasElement;
    let error = $state("");
    let session: MultiplayerSession | undefined;

    const mobile = shouldUseOnscreenKeyboard();

    async function enterMobileGameDisplayMode(): Promise<void> {
        if (!mobile) {
            return;
        }

        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }

            await screen.orientation.lock("landscape");
        } catch {
        }
    }

    onMount(() => {
        const launch = $gameLaunch;
        if (!launch) {
            push({ path: "/" });
            return;
        }

        session = launch.mode === "online" ? launch.session : undefined;
        enterMobileGameDisplayMode();
        runGame(canvas, session).catch((cause) => {
            error = String(cause);
        });
    });

    onDestroy(() => {
        session?.close();
        gameLaunch.set(undefined);
    });
</script>

<div class="game-wrapper" class:mobile>
    <div class="game-frame">
        <canvas bind:this={canvas} width="1280" height="700" onclick={enterMobileGameDisplayMode}>
            Canvas API unavailable
        </canvas>
    </div>

    {#if error}
        <p>{error}</p>
    {/if}
</div>

<style>
    .game-wrapper {
        width: calc(100% - 40px);
        height: calc(100% - 40px);
        margin: 20px;
        container-type: size;
        display: grid;
        place-items: center;
    }

    .game-frame {
        padding: 10px 20px;
        background-color: var(--color-grey);
        box-shadow: 20px 20px 0px 1px var(--color-black);
    }

    canvas {
        display: block;
        box-sizing: content-box;
        width: max(
            0px,
            min(calc(100cqw - 110px), calc(182.857142857cqh - 128px))
        );
        height: auto;
        padding: 10px 20px;
        image-rendering: pixelated;
        border: solid 5px var(--color-black);
    }

    p {
        text-align: center;
    }

    .game-wrapper.mobile {
        width: 100%;
        height: 100%;
        margin: 0;

        canvas {
            width: max(
                0px,
                min(100cqw, 182.857142857cqh)
            );
            padding: 0;
            border: none;
        }

        .game-frame {
            padding: 0;
            background-color: unset;
            box-shadow: unset;
        }
    }
</style>
