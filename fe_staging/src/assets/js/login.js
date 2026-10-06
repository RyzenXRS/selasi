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

// Path endpoint. "verifikasi" belum ada di config.js, jadi diberi nilai bawaan.
// Kalau BE memakai path lain, tambahkan  verifikasi: "/path-nya"  di ENDPOINTS pada config.js
const EP = {
  login:  ENDPOINTS.login,
  forgot: ENDPOINTS.forgot,
  verify: ENDPOINTS.verifikasi || "/verify-code",
  reset:  ENDPOINTS.reset,
};

// ---------- Data palsu untuk uji coba (USE_MOCK = true di config.js) ----------
//   Berhasil : pembudidaya@selasi.com / 12345678
//   Role lain: admin@selasi.com / 12345678
//   Lupa password: pakai pembudidaya@selasi.com. Kode verifikasi ditampilkan di layar.
let mockKode = "";
const acakKode = () => {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => huruf[Math.floor(Math.random() * huruf.length)]).join("");
};

function mockPost(path, body) {
  if (path === EP.login) {
    if (body.password !== "12345678") return { ok: false, data: {} };
    if (body.email === "pembudidaya@selasi.com") {
      return { ok: true, data: { token: "token-palsu", user: { id_pengguna: 1, email: body.email, role: "pembudidaya" } } };
    }
    if (body.email === "admin@selasi.com") {
      return { ok: true, data: { token: "token-palsu", user: { id_pengguna: 2, email: body.email, role: "admin" } } };
    }
    return { ok: false, data: {} };
  }
  if (path === EP.forgot) {
    if (body.email !== "pembudidaya@selasi.com") return { ok: false, data: {} };
    mockKode = acakKode();
    return { ok: true, data: { kode_uji: mockKode } };
  }
  if (path === EP.verify) {
    return { ok: !!mockKode && body.kode === mockKode, data: {} };
  }
  return { ok: true, data: {} }; // simpan password baru
}

async function post(path, body) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600)); // pura-pura menunggu server
    return mockPost(path, body);
  }
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, data };
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
    return showAlert("alert-login", "Email atau Password salah");
  }

  await withButton($("btn-login"), "Memproses...", async () => {
    try {
      const { ok, data } = await post(EP.login, { email, password });
      if (!ok) return showAlert("alert-login", "Email atau Password salah");

      // Identifikasi role (sesuaikan nama field dengan respons BE)
      const role = data.user?.role ?? data.role;
      if (String(role).toLowerCase() !== ROLE_PEMBUDIDAYA) {
        return showAlert("alert-login", "Akun ini bukan akun Pembudidaya.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", ROLE_PEMBUDIDAYA);
      localStorage.setItem("user", JSON.stringify(data.user ?? {}));
      window.location.href = DASHBOARD_URL;
    } catch (err) {
      showAlert("alert-login", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// ---------- UC2 Lupa password ----------
const pulih = { email: "", kode: "", token: "" };

// Langkah 1: email pemulihan -> kirim kode verifikasi
views.forgot.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("forgot-email").value.trim();
  if (!isEmail(email)) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

  await withButton($("btn-forgot"), "Mengirim...", async () => {
    try {
      const { ok, data } = await post(EP.forgot, { email });
      if (!ok) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

      pulih.email = email;
      $("code-input").value = "";
      $("code-hint").textContent = "Kami mengirim kode 6 karakter ke " + email + ". Masukkan kode tersebut di bawah.";
      showView("code");
      if (data.kode_uji) {
        showAlert("alert-code", "Mode uji coba: kode verifikasimu adalah " + data.kode_uji, "success");
      }
      $("code-input").focus();
    } catch (err) {
      showAlert("alert-forgot", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// Langkah 2: kode verifikasi
views.code.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kode = $("code-input").value.trim().toUpperCase();
  if (kode.length !== 6) return showAlert("alert-code", "Kode Verifikasi tidak sesuai");

  await withButton($("btn-code"), "Memeriksa...", async () => {
    try {
      const { ok, data } = await post(EP.verify, { email: pulih.email, kode });
      if (!ok) return showAlert("alert-code", "Kode Verifikasi tidak sesuai");

      pulih.kode = kode;
      pulih.token = data.token ?? data.data?.token ?? "";
      $("reset-password").value = "";
      $("reset-confirm").value = "";
      showView("reset");
      $("reset-password").focus();
    } catch (err) {
      showAlert("alert-code", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// Langkah 3: password baru dan konfirmasi
views.reset.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("reset-password").value;
  const confirm = $("reset-confirm").value;

  if (!password || password !== confirm) {
    return showAlert("alert-reset", "Password Baru atau Konfirmasi Password tidak sesuai");
  }
  if (password.length < 8) {
    return showAlert("alert-reset", "Password minimal 8 karakter.");
  }

  await withButton($("btn-reset"), "Menyimpan...", async () => {
    try {
      const { ok, data } = await post(EP.reset, {
        email: pulih.email,
        kode: pulih.kode,
        token: pulih.token,
        password,
        password_confirmation: confirm,
      });
      if (!ok) return showAlert("alert-reset", data.message || "Password Baru atau Konfirmasi Password tidak sesuai");

      // Post-condition UC2: pembudidaya login memakai password baru
      showView("login");
      $("login-email").value = pulih.email;
      $("login-password").value = "";
      showAlert("alert-login", "Password berhasil diperbarui. Silakan masuk dengan password barumu.", "success");
      $("login-password").focus();
    } catch (err) {
      showAlert("alert-reset", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});