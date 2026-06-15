<script lang="ts">
    import type {
        Route,
        RouterOptions,
    } from "@dvcol/svelte-simple-router/models";
    import Home from "./routes/Home.svelte";
    import Host from "./routes/Host.svelte";
    import { RouterView, RouteView } from "@dvcol/svelte-simple-router";
    import Join from "./routes/Join.svelte";
    import Game from "./routes/Game.svelte";

    const RouteName = {
        Home: "home",
        Host: "host",
        Join: "join",
        Game: "game"
    } as const;

    type RouteNames = (typeof RouteName)[keyof typeof RouteName];

    const routes: Readonly<Route<RouteNames>[]> = [
        {
            name: RouteName.Home,
            path: "/",
            component: Home,
        },
        {
            name: RouteName.Host,
            path: "/host",
            component: Host,
        },
        {
            name: RouteName.Join,
            path: "/join",
            component: Join
        },
        {
            name: RouteName.Game,
            path: "/game",
            component: Game
        }
    ] as const;

    const options: RouterOptions<RouteNames> = {
        routes,
    } as const;
</script>

<div class="view">
    <h1 class="title">GORILLA.JS</h1>

    <div class="content">
        <RouterView {options} />
    </div>
</div>

<style lang="scss">
    .view {
        flex: 1;
        border: solid 5px var(--color-grey);
        margin: 3% 5%;
        position: relative;
        display: flex;
    }

    .content {
        overflow: auto;
        flex: 1;
        min-width: 0;
        min-height: 0;
        padding: 40px;
    }

    .title {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translate(-50%, -50%);
        color: var(--color-blue);
        background-color: var(--color-grey);
        padding: 5px 20px;
        font-size: 28px;
    }
</style>
