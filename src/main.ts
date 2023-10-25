import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app")!,
  props: {
    appId: "ここにアプリケーションIDをペーストしてください",
    secretKey: "ここにシークレットキーをペーストしてください",
  },
});

export default app;
