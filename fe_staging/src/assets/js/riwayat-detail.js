// Detail Riwayat Budidaya (UC17).
// Dimuat SETELAH riwayat.js. Menggantikan showDetail() lama supaya tampilan detail lebih rapi
// dan fase dihitung otomatis dari tanggal tanam. Data dan pemanggilan API di riwayat.js tidak diubah.
(function () {
  const NAMA = ["Semai", "Peremajaan", "Pendewasaan"];
  const tgl = (s) => toDate(String(s).slice(0, 10)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  // Fase otomatis: Semai 0-14 hari, Peremajaan sampai hari ke-21, Pendewasaan sampai panen (45-55 hari).
  // Baris fase muncul bertahap sesuai umur batch (atau sampai tanggal panen kalau sudah dipanen).
  function hitungFase(b) {
    const tanam = b.tanggal_tanam;
    if (!tanam) return { fase: [], berikut: null };
    const tglPanen = b.panen && b.panen.tanggal_panen ? String(b.panen.tanggal_panen).slice(0, 10) : "";
    const umur = selisih(toDate(tanam), tglPanen ? toDate(tglPanen) : today());
    const batas = [UMUR_SEMAI, UMUR_PEREMAJAAN, umurPanen(b)]; // umur saat tiap fase berakhir

    const fase = [];
    for (let i = 0; i < 3; i++) {
      const dariUmur = i === 0 ? 0 : batas[i - 1];
      if (umur < dariUmur) break; // fase ini belum tercapai
      const selesai = i < 2 ? umur >= batas[i] : !!tglPanen;
      const mulai = addDays(tanam, dariUmur);
      const target = addDays(tanam, batas[i]);
      const akhir = selesai ? (i === 2 ? tglPanen : target) : "";
      const lama = selesai
        ? selisih(toDate(mulai), toDate(akhir)) + " hari"
        : "Berjalan · " + (umur - dariUmur) + (i < 2 ? " dari " + (batas[i] - dariUmur) : "") + " hari";
      fase.push({ no: i + 1, nama: NAMA[i], mulai, akhir, target, selesai, lama });
    }

    const last = fase[fase.length - 1];
    const berikut = last && !last.selesai ? { nama: last.no < 3 ? NAMA[last.no] : "Panen", tanggal: last.target } : null;
    return { fase, berikut };
  }

  function baris(label, nilai, lebar) {
    const r = el("div", undefined, "dt-row" + (lebar ? " wide" : ""));
    r.append(el("dt", label), el("dd", nilai === undefined || nilai === null || nilai === "" ? "-" : String(nilai)));
    return r;
  }
  function bagian(judul, ...isi) {
    const s = el("section", undefined, "dt-sec");
    s.append(el("h3", judul), ...isi);
    return s;
  }

  window.showDetail = function (id) {
    const b = data.find((x) => String(x.id) === String(id));
    if (!b) return showList();

    const { fase } = hitungFase(b);

    // Kepala: kode batch, status, ringkasan singkat
    const judul = el("h2", b.kode_pengelolaan, "dt-title");
    judul.tabIndex = -1;
    const meta = el("p", `${b.jumlah_tanaman} tanaman · ${b.lokasi || "-"} · Tanam ${b.tanggal_tanam ? tgl(b.tanggal_tanam) : "-"}`, "dt-meta");
    const kiri = el("div"); kiri.append(judul, meta);
    const badge = el("span", b.status, STATUS_CLASS[b.status] || "badge");
    const kembali = el("button", "Kembali", "btn btn-ghost");
    kembali.type = "button";
    kembali.addEventListener("click", showList);
    const kanan = el("div", undefined, "dt-side"); kanan.append(badge, kembali);
    const head = el("header", undefined, "dt-head"); head.append(kiri, kanan);

    // Kondisi budidaya
    const kondisi = el("dl", undefined, "dt-list");
    kondisi.append(
      baris("Kondisi tanaman", b.kondisi_tanaman),
      baris("Kondisi air dan nutrisi", b.kondisi_air_nutrisi),
      baris("Kondisi instalasi", b.kondisi_instalasi),
      baris("Kondisi lingkungan", b.kondisi_lingkungan),
      baris("Nilai pH", b.nilai_ph === undefined || b.nilai_ph === null || b.nilai_ph === "" ? "-" : fmtAngka(b.nilai_ph)),
      baris("Catatan", b.catatan, true)
    );

    // Riwayat perpindahan fase (otomatis dari tanggal tanam)
    const garis = el("ol", undefined, "dt-line");
    fase.forEach((f) => {
      const li = el("li", undefined, f.selesai ? "" : "now");
      const t = el("div", undefined, "t");
      t.append(el("b", f.no + ". " + f.nama), el("span", f.lama));
      const akhirTxt = f.selesai ? "Selesai " + tgl(f.akhir) : (f.no === 3 ? "Perkiraan panen " : "Target selesai ") + tgl(f.target);
      li.append(t, el("p", "Mulai " + tgl(f.mulai) + " · " + akhirTxt));
      garis.appendChild(li);
    });
    if (!fase.length) garis.appendChild(el("li", "Tanggal tanam belum tercatat."));

    // Data panen
    const p = b.panen;
    let panen;
    if (p) {
      panen = el("dl", undefined, "dt-figs");
      [["Kode panen", p.kode_panen], ["Tanggal panen", p.tanggal_panen ? tgl(p.tanggal_panen) : "-"],
       ["Jumlah panen", p.jumlah_panen + " tanaman"], ["Berat panen", fmtAngka(p.berat_panen) + " kg"],
       ["Kondisi hasil panen", p.kondisi_hasil_panen]].forEach(([k, v]) => {
        const d = el("div"); d.append(el("dt", k), el("dd", v || "-")); panen.appendChild(d);
      });
    } else {
      panen = el("p", "Belum ada data panen untuk batch ini.", "dt-none");
    }

    const box = $("detail");
    box.className = "panel dt";
    box.replaceChildren(
      head,
      bagian("Kondisi budidaya", kondisi),
      bagian("Riwayat perpindahan fase", garis),
      bagian("Data panen", panen)
    );

    showOnly("detail");
    window.scrollTo({ top: 0 });
    judul.focus({ preventScroll: true });
  };
})();

// ---------- Riwayat Transaksi: klik di baris mana pun untuk membuka detail ----------
// Memakai tombol nomor pesanan yang sudah dibuat riwayat.js, jadi pemanggilan detail ke backend tidak berubah.
(function () {
  const rows = document.getElementById("tx-rows");
  if (!rows) return;
  rows.addEventListener("click", function (e) {
    if (e.target.closest(".link-nomor")) return;                          // tombolnya sendiri sudah punya aksi
    if (window.getSelection && String(window.getSelection())) return;     // jangan buka saat pengguna menyeleksi teks
    const tr = e.target.closest("tr");
    const tombol = tr && tr.querySelector(".link-nomor");
    if (tombol) tombol.click();
  });
})();

// ---------- Riwayat Transaksi: tampilan detail (UC29) ----------
// Menggantikan renderDetailTx() lama dengan tampilan satu kolom yang dikelompokkan.
// Pengambilan data ke backend (fetchDetailTx) di riwayat.js tidak diubah.
(function () {
  function baris(label, nilai, kelas) {
    const r = el("div", undefined, "dt-row" + (kelas ? " " + kelas : ""));
    const dd = el("dd");
    if (nilai instanceof Node) dd.appendChild(nilai);
    else dd.textContent = nilai === undefined || nilai === null || nilai === "" ? "-" : String(nilai);
    r.append(el("dt", label), dd);
    return r;
  }
  function bagian(judul, ...isi) {
    const s = el("section", undefined, "dt-sec");
    const dl = el("dl", undefined, "dt-list");
    dl.append(...isi);
    s.append(el("h3", judul), dl);
    return s;
  }

  window.renderDetailTx = function (p) {
    const judul = el("h2", p.nomor_pesanan || "-", "dt-title");
    judul.id = "tx-nomor";
    judul.tabIndex = -1;
    const kiri = el("div");
    kiri.appendChild(judul);
    if (p.kode_batch) kiri.appendChild(el("p", "Kode batch " + p.kode_batch, "dt-meta"));

    const badge = el("span", p.status_pesanan || "-", badgeTx(p.status_pesanan));
    const kembali = el("button", "Kembali", "btn btn-ghost");
    kembali.type = "button";
    kembali.addEventListener("click", renderTx);
    const kanan = el("div", undefined, "dt-side");
    kanan.append(badge, kembali);
    const head = el("header", undefined, "dt-head");
    head.append(kiri, kanan);

    const box = $("t-detail");
    box.className = "panel dt";
    box.replaceChildren(
      head,
      bagian("Informasi pesanan",
        baris("Nomor pesanan", p.nomor_pesanan),
        baris("Tanggal pesanan", fmtWaktu(p.tanggal_pesanan)),
        baris("Nama pembeli", p.nama_pembeli),
        baris("Status pesanan", badgeNode(p.status_pesanan))
      ),
      bagian("Rincian produk",
        baris("Nama produk", p.nama_produk),
        baris("Jumlah produk", kg(p.jumlah_produk)),
        baris("Harga produk", rupiah(p.harga_produk)),
        baris("Subtotal produk", rupiah(p.subtotal_produk))
      ),
      bagian("Pembayaran",
        baris("Metode pembayaran", p.metode_pembayaran),
        baris("Status pembayaran", badgeNode(p.status_pembayaran)),
        baris("Tanggal pembayaran", fmtWaktu(p.tanggal_pembayaran, "Belum dibayar")),
        baris("Total pembayaran", rupiah(p.total_pembayaran), "total")
      )
    );

    showOnly("t-detail");
    window.scrollTo({ top: 0 });
    judul.focus({ preventScroll: true });
  };
})();