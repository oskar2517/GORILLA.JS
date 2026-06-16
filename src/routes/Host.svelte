<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Comment from "../lib/Comment.svelte";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import { createHostConnection, type HostConnection } from "../game/webrtc";
    import RoomCodeInput from "../lib/RoomCodeInput.svelte";

    const { push } = useNavigate();

    let roomCode = $state("");
    let error = $state("");
    let waitingForOpponent = $state(true);
    let connected = $state(false);
    let connection: HostConnection | undefined;

    onMount(async () => {
        try {
            connection = createHostConnection();
            roomCode = connection.roomCode;

            const session = await connection.session;

            connected = true;
            $gameLaunch = { mode: "online", session };
            push({ path: "/game" });
        } catch (cause) {
            error = String(cause);
            waitingForOpponent = false;
        }
    });

    onDestroy(() => {
        if (!connected) {
            connection?.close();
        }
    });
</script>

<View>
    <Comment text="Share this room code with your opponent."></Comment>

    <RoomCodeInput readonly={true} value={roomCode}></RoomCodeInput>

    {#if waitingForOpponent && !connected}
        <Comment text="Waiting for opponent to join..."></Comment>
    {/if}

    {#if error}
        <Comment text={error}></Comment>
    {/if}
</View>
