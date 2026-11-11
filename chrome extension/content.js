console.log("[QuoteToComfy] content script aktif");


const BOT_MESSAGE_SELECTOR = "p";

function extractQuotes(text) {
  const regex = /"([^"]+)"|“([^”]+)”|«([^»]+)»/g;
  const results = [];
  let m;
  while ((m = regex.exec(text)) !== null) results.push(m[1] || m[2] || m[3]);
  return results;
}

function toast(msg, ok = true) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "70px", right: "20px", zIndex: 2147483647,
    padding: "10px 16px", borderRadius: "8px", color: "#fff",
    background: ok ? "#2a7" : "#c33", font: "14px sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,.4)",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

let busy = false;

function send(text) {
  const quotes = extractQuotes(text);
  if (!quotes.length) return toast("Tidak ada teks berkutip", false);
  if (busy) return toast("Masih memproses...", false);

  busy = true;
  toast("⏳ Generating: " + quotes[0].slice(0, 40));

  try {
    chrome.runtime.sendMessage({ type: "speak", text: quotes.join(" ") }, (res) => {
      busy = false;
      if (chrome.runtime.lastError) {
        return toast("Error: " + chrome.runtime.lastError.message, false);
      }
      if (!res || !res.ok) {
        return toast("Gagal: " + ((res && res.error) || "tidak ada respons"), false);
      }
      toast("🔊 Memutar");
    });
  } catch (e) {
    busy = false;
    toast("Ekstensi di-reload, refresh halaman (F5)", false);
  }
}

function sendLast() {
  const sel = window.getSelection().toString();
  if (sel && extractQuotes(sel).length) return send(sel);

  const nodes = [...document.querySelectorAll(BOT_MESSAGE_SELECTOR)]
    .filter((n) => extractQuotes(n.innerText).length > 0);
  const last = nodes[nodes.length - 1];
  if (last) send(last.innerText);
  else toast("Pesan berkutip tidak ditemukan", false);
}

const btn = document.createElement("button");
btn.textContent = "🔊";
btn.title = "Bacakan pesan bot terakhir";
Object.assign(btn.style, {
  position: "fixed", bottom: "20px", right: "20px", zIndex: 2147483647,
  width: "44px", height: "44px", borderRadius: "50%", border: "none",
  background: "#7c3aed", color: "#fff", fontSize: "20px", cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,.5)",
});
btn.addEventListener("mousedown", (e) => e.preventDefault());
btn.addEventListener("click", sendLast);
document.body.appendChild(btn);

document.addEventListener("click", (e) => {
  if (!e.altKey) return;
  const block = e.target.closest("p") || e.target;
  e.preventDefault();
  e.stopPropagation();
  send(block.innerText);
}, true);

// Alt + S
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyS") {
    e.preventDefault();
    sendLast();
  }
}, true);

toast("✅ Quote to ComfyUI aktif");
