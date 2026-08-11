<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Comment from "../lib/Comment.svelte";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import { createHostConnection, type HostConnection } from "../game/webrtc";
    import RoomCodeInput from "../lib/RoomCodeInput.svelte";
    import Button from "../lib/Button.svelte";

    const { push } = useNavigate();

    const DEFAULT_QUICK_JOIN_BUTTON_TEXT = "Copy quick join link";

    let roomCode = $state("");
    let error = $state("");
    let waitingForOpponent = $state(true);
    let connected = $state(false);
    let connection: HostConnection | undefined;

    let quickJoinButtonValue = $state(DEFAULT_QUICK_JOIN_BUTTON_TEXT);
    let quickJoinButtonDisabled = $derived(roomCode === "");

    async function copyQuickJoinLink() {
        if (roomCode === "") return;

        const link = `${location.origin}/#/join?room=${encodeURIComponent(roomCode)}`;
        quickJoinButtonDisabled = true;

        try {
            await navigator.clipboard.writeText(link);
            quickJoinButtonValue = "Copied to clipboard";
        } catch (err) {
            console.error(err);
            quickJoinButtonValue = "Failed to copy!";
        }

        setTimeout(() => {
            quickJoinButtonDisabled = false;
            quickJoinButtonValue = DEFAULT_QUICK_JOIN_BUTTON_TEXT;
        }, 2000);
    }

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

    <Button value={quickJoinButtonValue} disabled={quickJoinButtonDisabled} onclick={copyQuickJoinLink}></Button>

    {#if waitingForOpponent && !connected}
        <Comment text="Waiting for opponent to join..."></Comment>
    {/if}

    {#if error}
        <Comment text={error}></Comment>
    {/if}
</View>
