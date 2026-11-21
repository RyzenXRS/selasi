// Foto profil (pp) di pojok kanan atas, di samping ikon lonceng (lonceng.js).
// Hanya menambah tampilan: tidak mengubah lonceng.js maupun profil.js. Dimuat setelah lonceng.js.
// Foto/inisial dari data login di localStorage "user" (profil.js menyimpan nama & foto_profil di sana).
(function () {
  function user() { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch (_) { return {}; } }
  function fotoUrl(path) {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return (typeof STORAGE_BASE_URL !== "undefined" ? STORAGE_BASE_URL : "") + String(path).replace(/^\/+/, "");
  }

  const css = document.createElement("style");
  css.textContent =
    "#user-email{display:none!important}" +
    ".notif-bell{right:80px!important}" +
    ".pp-profil{position:fixed;top:18px;right:24px;z-index:40;width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;" +
    "background:#31572C;color:#ECF39E;border:1.5px solid #d5e2b3;font:600 .95rem Poppins,system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 12px rgba(49,87,44,.15);" +
    "transition:transform .15s ease;animation:pp-masuk .5s ease both}" +
    ".pp-profil:hover{transform:scale(1.08)}" +
    ".pp-profil:focus-visible{outline:3px solid #90A955;outline-offset:2px}" +
    ".pp-profil img{width:100%;height:100%;object-fit:cover}" +
    "@keyframes pp-masuk{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.pp-profil{animation:none;transition:none}}" +
    "@media(max-width:800px){.notif-bell{right:72px!important}.pp-profil{top:auto;bottom:20px;right:16px}}";
  document.head.appendChild(css);

  function pasang() {
    if (document.querySelector(".pp-profil") || !document.querySelector(".app")) return;
    const u = user();
    const nama = String(u.nama || u.name || "").trim();
    const inisial = nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0].toUpperCase()).join("") || "?";
    const a = document.createElement("a");
    a.className = "pp-profil";
    a.href = "profil.html";
    a.setAttribute("aria-label", "Akun Saya");
    const url = fotoUrl(u.foto_profil);
    if (url) {
      const img = document.createElement("img");
      img.alt = ""; img.src = url;
      img.addEventListener("error", () => { img.remove(); a.textContent = inisial; });
      a.appendChild(img);
    } else a.textContent = inisial;
    document.body.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang();
})();