<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import TextArea from "../lib/TextArea.svelte";
    import { gameLaunch } from "../lib/game-session";
    import {
        createHostConnection,
        type HostConnection,
    } from "../game/webrtc";

    const { push } = useNavigate();

    let offer = $state("");
    let answer = $state("");
    let error = $state("");
    let creatingOffer = $state(true);
    let acceptingAnswer = $state(false);
    let connected = $state(false);
    let connection: HostConnection | undefined;

    onMount(async () => {
        try {
            connection = await createHostConnection();
            offer = connection.offer;
        } catch (cause) {
            error = String(cause);
        } finally {
            creatingOffer = false;
        }
    });

    onDestroy(() => {
        if (!connected) {
            connection?.close();
        }
    });

    async function acceptAnswer(): Promise<void> {
        if (!connection || !answer.trim() || acceptingAnswer || connected) {
            return;
        }

        acceptingAnswer = true;
        error = "";

        try {
            const session = await connection.acceptAnswer(answer);
            connected = true;
            gameLaunch.set({ mode: "online", session });
            push({ path: "/game" });
        } catch (cause) {
            error = String(cause);
            acceptingAnswer = false;
        }
    }
</script>

<Comment text="1. Opponent clicks 'Join online game'."></Comment>

<Comment text=""></Comment>

<Comment
    text="2. Opponent pastes the following code into 'Offer' and clicks 'Create answer'."
></Comment>

<TextArea
    placeholder="Offer"
    readonly={true}
    disabled={creatingOffer || !offer || connected}
    bind:value={offer}
></TextArea>

<Comment text="3. Paste opponent's answer below and click 'Accept answer'."
></Comment>

<TextArea
    placeholder="Answer"
    disabled={creatingOffer || !offer || acceptingAnswer || connected}
    bind:value={answer}
></TextArea>

<Button
    value={acceptingAnswer ? "Connecting..." : "Accept answer"}
    disabled={!answer.trim() || creatingOffer || acceptingAnswer || connected}
    onclick={acceptAnswer}
></Button>

{#if error}
    <Comment text={error}></Comment>
{/if}
