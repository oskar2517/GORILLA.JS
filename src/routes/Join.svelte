<script lang="ts">
    import { onDestroy } from "svelte";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import TextArea from "../lib/TextArea.svelte";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import {
        createJoinConnection,
        type JoinConnection,
    } from "../game/webrtc";

    const { push } = useNavigate();

    let offer = $state("");
    let answer = $state("");
    let error = $state("");
    let creatingAnswer = $state(false);
    let answerCreated = $state(false);
    let connected = $state(false);
    let connection: JoinConnection | undefined;

    onDestroy(() => {
        if (!connected) {
            connection?.close();
        }
    });

    async function createAnswer(): Promise<void> {
        if (!offer.trim() || creatingAnswer || answerCreated) {
            return;
        }

        creatingAnswer = true;
        error = "";

        try {
            connection = await createJoinConnection(offer);
            answer = connection.answer;
            answerCreated = true;
            creatingAnswer = false;

            const session = await connection.session;
            connected = true;
            gameLaunch.set({ mode: "online", session });
            push({ path: "/game" });
        } catch (cause) {
            error = String(cause);
            creatingAnswer = false;
        }
    }
</script>

<View>
    <Comment text="1. Paste offer from host and click 'Create answer'."></Comment>

    <TextArea
        placeholder="Offer"
        disabled={creatingAnswer || answerCreated || connected}
        bind:value={offer}
    ></TextArea>

    <Button
        value={creatingAnswer ? "Creating answer..." : "Create answer"}
        disabled={!offer.trim() || creatingAnswer || answerCreated || connected}
        onclick={createAnswer}
    ></Button>

    <Comment text="2. Host pastes answer into 'Answer' and clicks 'Accept answer'."
    ></Comment>

    <TextArea
        placeholder="Answer"
        readonly={true}
        disabled={!answerCreated || !answer || connected}
        bind:value={answer}
    ></TextArea>

    {#if error}
        <Comment text={error}></Comment>
    {/if}
</View>
