<script lang="ts">
    import type {
        Route,
        RouterOptions,
    } from "@dvcol/svelte-simple-router/models";
    import Home from "./routes/Home.svelte";
    import Host from "./routes/Host.svelte";
    import { RouterView } from "@dvcol/svelte-simple-router";
    import Join from "./routes/Join.svelte";
    import Game from "./routes/Game.svelte";

    const RouteName = {
        Home: "home",
        Host: "host",
        Join: "join",
        Game: "game",
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
            component: Join,
        },
        {
            name: RouteName.Game,
            path: "/game",
            component: Game,
        },
    ] as const;

    const options: RouterOptions<RouteNames> = {
        routes,
    } as const;
</script>

<RouterView {options} />
