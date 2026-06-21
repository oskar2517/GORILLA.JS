import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const app = mount(App, {
    target: document.getElementById("app")!,
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
    });
}

export default app;
