const player = new Audio();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "play") {
    player.pause();
    player.src = msg.url;
    player.play().catch((e) => console.error("play gagal:", e));
  }
});
