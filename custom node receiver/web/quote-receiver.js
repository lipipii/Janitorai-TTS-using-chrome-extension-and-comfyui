import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "quote_receiver.autoqueue",
  setup() {
    api.addEventListener("quote_receiver.trigger", () => {
      app.queuePrompt(0, 1);
    });
  },
});