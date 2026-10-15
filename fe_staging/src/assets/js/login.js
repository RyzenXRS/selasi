// ---------- Helper ----------
const $ = (id) => document.getElementById(id);

const views = {
  login:  $("form-login"),
  forgot: $("form-forgot"),
  code:   $("form-code"),
  reset:  $("form-reset"),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
  document.querySelectorAll(".alert").forEach((a) => (a.hidden = true));
}

function showAlert(id, message, type = "error") {
  const el = $(id);
  el.textContent = message;
  el.className = "alert " + type;
  el.hidden = false;
}

// Path endpoint
const EP = {
  login:  ENDPOINTS.login,
  forgot: ENDPOINTS.forgot,
};

async function post(path, body) {
  const url = API_BASE_URL + path;
  console.log("%c[API REQUEST] POST " + url, "color: #2f5230; font-weight: bold;", body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    console.error("[API ERROR] Gagal parse JSON:", err);
  }

  console.log(
    `%c[API RESPONSE] Status: ${res.status}`,
    res.ok ? "color: green; font-weight: bold;" : "color: red; font-weight: bold;",
    data
  );

  return { ok: res.ok, status: res.status, data };
}

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

// Jalankan aksi sambil mengunci tombol
async function withButton(btn, loadingText, fn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = label; }
}

// ---------- Tombol Lihat/Sembunyikan password ----------
document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    btn.textContent = hidden ? "Sembunyikan" : "Lihat";
  });
});

// ---------- Pindah antar tampilan ----------
$("link-forgot").addEventListener("click", (e) => { e.preventDefault(); showView("forgot"); $("forgot-email").focus(); });
document.querySelectorAll("[data-back]").forEach((a) =>
  a.addEventListener("click", (e) => { e.preventDefault(); showView("login"); })
);

// ---------- UC1 Login ----------
views.login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) {
    return showAlert("alert-login", "Email dan Password wajib diisi.");
  }

  await withButton($("btn-login"), "Memproses...", async () => {
    try {
      const { ok, status, data } = await post(EP.login, { email, password });

      if (!ok) {
        console.warn("[LOGIN GAGAL]", data);
        const errorMsg = data.message ||
          (data.errors ? Object.values(data.errors).flat()[0] : null) ||
          "Email atau Password salah";
        return showAlert("alert-login", errorMsg);
      }

      // Backend response format: { success: true, message: "...", data: { user: {...}, token: "..." } }
      const payload = data.data || data;
      const user = payload.user;
      const token = payload.token;
      const role = String(user?.role ?? "").toLowerCase();

      console.log("%c[LOGIN BERHASIL] Akun:", "color: green; font-weight: bold;", user);
      console.log("[LOGIN BERHASIL] Sanctum Token:", token);

      if (role !== ROLE_PEMBUDIDAYA) {
        console.warn("[ROLE BUKAN PEMBUDIDAYA]:", role);
        return showAlert("alert-login", "Akun ini bukan akun Pembudidaya.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", ROLE_PEMBUDIDAYA);
      localStorage.setItem("user", JSON.stringify(user ?? {}));

      showAlert("alert-login", "Login berhasil! Mengalihkan ke dashboard...", "success");

      // Beri jeda 800ms agar user dan developer sempat melihat log response di console
      setTimeout(() => {
        window.location.href = DASHBOARD_URL;
      }, 800);
    } catch (err) {
      console.error("[KONEKSI ERROR]", err);
      showAlert("alert-login", "Tidak bisa terhubung ke backend. Pastikan server backend (php artisan serve) sudah berjalan di http://127.0.0.1:8000.");
    }
  });
});

// ---------- UC2 Lupa password ----------
const pulih = { email: "" };

views.forgot.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("forgot-email").value.trim();
  if (!isEmail(email)) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

  await withButton($("btn-forgot"), "Mengirim...", async () => {
    try {
      const { ok, data } = await post(EP.forgot, { email });
      if (!ok) return showAlert("alert-forgot", data.message || "Email Pemulihan tidak sesuai");

      pulih.email = email;
      // Backend berhasil mengirim link reset
      showView("login");
      showAlert("alert-login", data.message || data.data?.message || "Link reset password telah dikirim ke email Anda.", "success");
    } catch (err) {
      showAlert("alert-forgot", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});