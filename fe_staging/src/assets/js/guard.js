// Dipasang di halaman yang butuh login (dashboard, dll).
// Kalau belum login atau bukan Pembudidaya, lempar balik ke halaman Login.
(function () {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== ROLE_PEMBUDIDAYA) {
    window.location.replace(LOGIN_URL);
  }
})();

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  window.location.href = LOGIN_URL;
}