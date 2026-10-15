// Dipasang di halaman yang butuh login (dashboard, dll).
// Kalau belum login atau bukan Pembudidaya, lempar balik ke halaman Login.
(function () {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== ROLE_PEMBUDIDAYA) {
    window.location.replace(LOGIN_URL);
  }
})();

async function logout() {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      await fetch(API_BASE_URL + ENDPOINTS.logout, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: "Bearer " + token },
      });
    } catch (_) {
      // Abaikan error jaringan saat logout; tetap hapus sesi lokal
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  window.location.href = LOGIN_URL;
}