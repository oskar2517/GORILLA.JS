<script lang="ts">
    import { onDestroy } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import { createJoinConnection, type JoinConnection } from "../game/webrtc";
    import RoomCodeInput from "../lib/RoomCodeInput.svelte";

    const { push } = useNavigate();

    let roomCode = $state("");
    let error = $state("");
    let connecting = $state(false);
    let connected = $state(false);
    let connection: JoinConnection | undefined;
    let roomCodeIsValid = $derived(/^\d{5}$/.test(roomCode));

    onDestroy(() => {
        if (!connected) {
            connection?.close();
        }
    });

    function handleWindowEnter(e: KeyboardEvent) {
        if (e.key === "Enter") {
            joinGame();
        }
    }

    async function joinGame(): Promise<void> {
        if (!roomCodeIsValid || connecting || connected) {
            return;
        }

        connecting = true;
        error = "";

        try {
            connection = createJoinConnection(roomCode);
            const session = await connection.session;
            connected = true;
            $gameLaunch = { mode: "online", session };
            push({ path: "/game" });
        } catch (cause) {
            error = String(cause);
            connecting = false;
            connection?.close();
            connection = undefined;
        }
    }
</script>

<svelte:window onkeydown={handleWindowEnter} />

<View>
    <Comment text="Enter the host's room code."></Comment>

    <RoomCodeInput bind:value={roomCode} disabled={connecting || connected}
    ></RoomCodeInput>

    <Button
        value={connecting ? "Connecting..." : "Join game"}
        disabled={!roomCodeIsValid || connecting || connected}
        onclick={joinGame}
    ></Button>

    {#if error}
        <Comment text={error}></Comment>
    {/if}
</View>
