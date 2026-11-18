<script lang="ts">
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import { CPU_DIFFICULTIES, gameLaunch, type CPUDifficulty } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import Radio from "../lib/Radio.svelte";
    import Dialog from "../lib/Dialog.svelte";

    const { push } = useNavigate();

    let cpuDifficulty: CPUDifficulty = $state("Medium");

    function playLocally(): void {
        $gameLaunch = { mode: "local" };
        push({ path: "/game" });
    }

    function playAgainstCpu(): void {
        $gameLaunch = { mode: "cpu", difficulty: cpuDifficulty };
        push({ path: "/game" });
    }

</script>

<View>
    <Comment>Play together on this device...</Comment>

    <Button value="Play against human" onclick={playLocally}></Button>

    <Comment>... or against the CPU.</Comment>

    <Dialog title="Difficulty">
        <Radio options={CPU_DIFFICULTIES} bind:value={cpuDifficulty}></Radio>
    </Dialog>

    <Button value="Play against CPU" onclick={playAgainstCpu}></Button>
</View>
