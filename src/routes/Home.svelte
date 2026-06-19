<script lang="ts">
    import Button from "../lib/Button.svelte";
    import Comment from "../lib/Comment.svelte";
    import gorilla from "../assets/gorilla-animated.gif";
    import { useNavigate } from "@dvcol/svelte-simple-router";
    import { gameLaunch } from "../lib/game-session";
    import View from "../lib/View.svelte";
    import IconLink from "../lib/IconLink.svelte";
    import iconGithub from "../assets/github.svg";
    import iconContact from "../assets/envelope-solid.svg";

    const { push } = useNavigate();

    function playLocally(): void {
        $gameLaunch = { mode: "local" };
        push({ path: "/game" });
    }
</script>

<View>
    <img class="gorilla" src={gorilla} alt="gorilla" />

    <Comment
        text="This website allows you to play a recreation of the classic DOS game Gorillas."
    ></Comment>
    <Comment text="You can play either against a local or an online opponent."
    ></Comment>
    <Comment text=""></Comment>
    <Comment text="Select how you want to play:"></Comment>

    <Button value="Play locally" onclick={playLocally}></Button>

    <Button value="Host online game" onclick={() => push({ path: "/host" })}
    ></Button>

    <Button value="Join online game" onclick={() => push({ path: "/join" })}
    ></Button>

    <IconLink text="View on GitHub" icon={iconGithub} href="https://github.com/oskar2517/GORILLA.JS"></IconLink>
    <IconLink text="Contact me" icon={iconContact} href="mailto:hello@gorillas.zone"></IconLink>
</View>

<style lang="scss">
    .gorilla {
        height: 200px;
        image-rendering: pixelated;
        display: block;
        margin: 20px auto;
    }

    @media (max-width: 700px) {
        .gorilla {
            height: 140px;
            margin: 12px auto 20px;
        }
    }
</style>
