// Penjaga halaman Pembeli: hanya Pembeli yang sudah login boleh membuka halaman ini.
// Dipakai setelah config.js di dashboard-pembeli.html dan profil-pembeli.html.
(function () {
  const LOGIN_PEMBELI = "login-pembeli.html";

  if (!localStorage.getItem("token") || localStorage.getItem("role") !== "pembeli") {
    location.replace(LOGIN_PEMBELI);
    return;
  }

  // Dipanggil juga oleh apiFetch (config.js) kalau token ditolak BE (401)
  window.logout = function () {
    ["token", "role", "user"].forEach((k) => localStorage.removeItem(k));
    location.href = LOGIN_PEMBELI;
  };

  function siap() {
    // Menu "Penjualan dan Transaksi" dari config.js khusus Pembudidaya, jadi dibuang dari sidebar Pembeli
    document.querySelectorAll('.sidebar .nav a[href="pesanan.html"]').forEach((a) => a.remove());

    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const el = document.getElementById("user-email");
      if (el) el.textContent = u.email || "";
    } catch (_) {}
    const btn = document.getElementById("btn-logout");
    if (btn) btn.addEventListener("click", window.logout);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", siap);
  else siap();
})();