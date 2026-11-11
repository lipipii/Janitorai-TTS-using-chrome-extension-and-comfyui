// change port, make sure its same with your comfyui port
const BASE = "http://127.0.0.1:8188";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`[${label}] ${e.message}`);
  }
}


async function generate(text) {
  await step("kirim teks ke node", async () => {
    const r = await fetch(`${BASE}/quote_receiver/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status + " (node belum terpasang?)");
  });

  const workflow = await step("baca workflow_api.json", async () => {
    const r = await fetch(chrome.runtime.getURL("workflow_api.json"));
    return r.json();
  });

  const { prompt_id } = await step("jalankan /prompt", async () => {
    const r = await fetch(`${BASE}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
    return r.json();
  });

  for (let i = 0; i < 600; i++) {
    await sleep(500);
    chrome.runtime.getPlatformInfo(); // menjaga service worker tetap hidup

    const hist = await step("cek history", async () =>
      (await fetch(`${BASE}/history/${prompt_id}`)).json()
    );
    const entry = hist[prompt_id];
    if (!entry) continue;

    if (entry.status && entry.status.status_str === "error") {
      throw new Error("Eksekusi workflow gagal di ComfyUI");
    }

    for (const out of Object.values(entry.outputs || {})) {
      const file = out.audio && out.audio[0];
      if (!file) continue;
      const q = new URLSearchParams({
        filename: file.filename,
        subfolder: file.subfolder || "",
        type: file.type || "temp",
      });
      return `${BASE}/view?${q}`;
    }

    if (entry.status && entry.status.completed) {
      throw new Error("Selesai, tapi tidak ada output audio (pakai Preview Audio / Save Audio)");
    }
  }
  throw new Error("Timeout menunggu ComfyUI");
}

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Memutar hasil TTS dari ComfyUI",
  });
  await sleep(300); 
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "speak") return;

  (async () => {
    try {
      const url = await generate(msg.text);
      await ensureOffscreen();
      await chrome.runtime.sendMessage({ target: "offscreen", type: "play", url });
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: String(e.message || e) });
    }
  })();

  return true;
});
