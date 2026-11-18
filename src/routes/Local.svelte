<script lang="ts">
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import Radio from "../lib/Radio.svelte";
    import Dialog from "../lib/Dialog.svelte";

    const { push } = useNavigate();

    let cpuDifficulty = $state("Medium");

    function playLocally(): void {
        $gameLaunch = { mode: "local" };
        push({ path: "/game" });
    }

</script>

<View>
    <Comment>Choose whether to play against a human...</Comment>

    <Button value="Play against human" onclick={playLocally}></Button>

    <Comment>... or against the CPU.</Comment>

    <Dialog title="Difficulty">
        <Radio options={["Easy", "Medium", "Hard", "Impossible"]} bind:value={cpuDifficulty}></Radio>
    </Dialog>

    <Button value="Play against CPU"></Button>
</View>
