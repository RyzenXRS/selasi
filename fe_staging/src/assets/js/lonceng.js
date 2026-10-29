// Notifikasi (UC31, UC32): data contoh bersama + ikon lonceng di semua halaman.
// Dimuat di setiap halaman setelah config.js. Saat BE siap, ganti notifBaca/notifTulis dengan API.
const NOTIF_KEY = "mock_notifikasi_v1";

function notifSeed() {
  const t = (jam) => new Date(Date.now() - jam * 3600000).toISOString().slice(0, 19).replace("T", " ");
  const n = (id, judul, isi, jam, status, jenis, ref) => ({
    id_notifikasi: id, judul_notifikasi: judul, isi_notifikasi: isi, tanggal_notifikasi: t(jam),
    status_notifikasi: status, jenis_notifikasi: jenis, referensi_notifikasi: ref,
  });
  return [
    n(5, "Pesanan baru masuk", "Pesanan ORD-20261003-006 dari Maya Putri menunggu diproses. Metode pembayaran COD.", 1, "Belum Dibaca", "Penjualan", "ORD-20261003-006"),
    n(4, "Batch mendekati perpindahan fase", "Batch SLD-002 akan pindah dari fase Peremajaan ke Pendewasaan dalam 2 hari.", 5, "Belum Dibaca", "Budidaya", "SLD-002"),
    n(3, "Batch siap dipanen", "Hasil prediksi AI menunjukkan batch SLD-006 sudah memasuki masa panen.", 26, "Belum Dibaca", "Budidaya", "SLD-006"),
    n(2, "Pembayaran COD dikonfirmasi", "Pembayaran tunai untuk pesanan ORD-20261001-002 sudah dikonfirmasi.", 50, "Sudah Dibaca", "Penjualan", "ORD-20261001-002"),
    n(1, "Nilai pH di luar rentang", "Nilai pH batch SLD-001 berada di luar rentang normal. Periksa kondisi air dan nutrisi.", 80, "Sudah Dibaca", "Budidaya", "SLD-001"),
  ];
}
function notifTulis(d) { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(d)); } catch (_) {} }
function notifBaca() {
  try { const s = localStorage.getItem(NOTIF_KEY); if (s) return JSON.parse(s); } catch (_) {}
  const d = notifSeed();
  notifTulis(d);
  return d;
}
function perbaruiBadgeNotif() {
  const badge = document.querySelector(".notif-bell .notif-badge");
  const bell = document.querySelector(".notif-bell");
  if (!badge || !bell) return;
  const belum = notifBaca().filter((x) => x.status_notifikasi === "Belum Dibaca").length;
  badge.textContent = belum > 99 ? "99+" : String(belum);
  badge.hidden = belum === 0;
  bell.setAttribute("aria-label", belum ? "Notifikasi, " + belum + " belum dibaca" : "Notifikasi");
}

(function pasangIkonNotifikasi() {
  function pasang() {
    if (document.querySelector(".notif-bell") || !document.querySelector(".app")) return;

    const css = document.createElement("style");
    css.textContent =
      ".notif-bell{position:fixed;top:18px;right:24px;z-index:40;width:44px;height:44px;border-radius:50%;background:#fff;border:1.5px solid #d5e2b3;color:#31572C;display:grid;place-items:center;box-shadow:0 4px 12px rgba(49,87,44,.15);text-decoration:none}" +
      ".notif-bell:hover{background:#ECF39E}" +
      ".notif-bell:focus-visible{outline:3px solid #90A955;outline-offset:2px}" +
      ".notif-bell svg{width:22px;height:22px}" +
      ".notif-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#b3321b;color:#fff;font:600 .72rem/20px Poppins,system-ui,sans-serif;text-align:center}" +
      ".notif-badge[hidden]{display:none}" +
      "@media(max-width:800px){.notif-bell{top:auto;bottom:20px;right:16px}}";
    document.head.appendChild(css);

    const a = document.createElement("a");
    a.className = "notif-bell";
    a.href = "notifikasi.html";
    a.setAttribute("aria-label", "Notifikasi");
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>' +
      '<span class="notif-badge" hidden></span>';
    document.body.appendChild(a);
    perbaruiBadgeNotif();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang);
  else pasang();
})();