<?php

namespace Database\Seeders;

use App\Models\DetailPesanan;
use App\Models\FaseBudidaya;
use App\Models\Notifikasi;
use App\Models\Panen;
use App\Models\Pembayaran;
use App\Models\Pengelolaan;
use App\Models\Pengguna;
use App\Models\PerpindahanFase;
use App\Models\Pesanan;
use App\Models\PrediksiPanen;
use App\Models\PrediksiPermintaan;
use App\Models\Produk;
use App\Models\Stok;
use App\Models\ToDo;
use App\Models\Ulasan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with realistic Smart Lettuce data (Bahasa Indonesia).
     */
    public function run(): void
    {
        // 1. Seed master data fase budidaya
        $this->call([
            FaseBudidayaSeeder::class,
        ]);

        $faseSemai       = FaseBudidaya::where('nama_fase', 'Semai')->first();
        $fasePeremajaan  = FaseBudidaya::whereIn('nama_fase', ['Peremajaan', 'Vegetatif'])->first();
        $fasePendewasaan = FaseBudidaya::where('nama_fase', 'Pendewasaan')->first();
        $fasePanen       = FaseBudidaya::where('nama_fase', 'Panen')->first();
        // 1. Akun Pembudidaya Wulan
        $pembudidaya = Pengguna::firstOrCreate(
            ['email' => 'wullaannggraeni@gmail.com'],
            [
                'nama'          => 'Wulan Kepet',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBUDIDAYA,
                'no_telepon'    => '081298765432',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(6),
                'updated_at'    => Carbon::now(),
            ]
        );
        // 2. Akun Pembudidaya (Demo)
        $pembudidaya = Pengguna::firstOrCreate(
            ['email' => 'petani@lettuce.com'],
            [
                'nama'          => 'Budi Santoso (GreenHydro Farm)',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBUDIDAYA,
                'no_telepon'    => '081298765432',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(6),
                'updated_at'    => Carbon::now(),
            ]
        );

        // 3. Akun Pembeli (Demo)
        $pembeli = Pengguna::firstOrCreate(
            ['email' => 'pembeli@lettuce.com'],
            [
                'nama'          => 'Siti Rahmawati',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBELI,
                'no_telepon'    => '085712345678',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(3),
                'updated_at'    => Carbon::now(),
            ]
        );

        // 4. Batch Pengelolaan Budidaya Selada (Rotasi: Semai 14 hari, Peremajaan sd 21 hari, Pendewasaan, Panen 45-55 hari)
        $pengelolaan1 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-001'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(48)->toDateString(),
                'jumlah_tanaman'      => 250,
                'lokasi'              => 'Modul NFT 01 - Meja Pendewasaan A',
                'kondisi_tanaman'     => 'Sangat Baik (Klorofil pekat, tajuk lebar, siap panen bertahap)',
                'kondisi_air_nutrisi' => 'Nutrisi stabil EC 1.8 mS/cm, Suhu 23.5°C',
                'kondisi_instalasi'   => 'Aliran NFT lancar 2 L/menit tanpa endapan',
                'kondisi_lingkungan'  => 'Suhu 24.5°C, Kelembaban 65%, DLI optimal',
                'nilai_ph'            => 6.25,
                'catatan'             => 'Varietas Romaine Green Towers. Umur 48 hari, masuk jendela panen pasar (45-55 hari).',
                'created_at'          => Carbon::now()->subDays(48),
                'updated_at'          => Carbon::now(),
            ]
        );

        $pengelolaan2 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-002'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(18)->toDateString(),
                'jumlah_tanaman'      => 300,
                'lokasi'              => 'Modul DFT 02 - Meja Peremajaan B',
                'kondisi_tanaman'     => 'Baik (Daun sejati 6-8 helai, pertumbuhan seragam)',
                'kondisi_air_nutrisi' => 'EC 1.5 mS/cm, Nutrisi AB Mix Selada',
                'kondisi_instalasi'   => 'Aerasi gelembung aktif, pompa berjalan 24 jam',
                'kondisi_lingkungan'  => 'Suhu 25.0°C, Kelembaban 68%',
                'nilai_ph'            => 6.40,
                'catatan'             => 'Varietas Butterhead Rex. Hari ke-18 di fase peremajaan, siap pindah pendewasaan di hari ke-21.',
                'created_at'          => Carbon::now()->subDays(18),
                'updated_at'          => Carbon::now(),
            ]
        );

        $pengelolaan3 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-003'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(6)->toDateString(),
                'jumlah_tanaman'      => 400,
                'lokasi'              => 'Rak Semai Rockwool - Meja Semai C',
                'kondisi_tanaman'     => 'Kecambah tumbuh serempak 98%',
                'kondisi_air_nutrisi' => 'Air baku PPM 80, kelembaban rockwool terjaga',
                'kondisi_instalasi'   => 'Baki semai bersih dengan pencahayaan growlight 14 jam',
                'kondisi_lingkungan'  => 'Suhu 23.2°C, Kelembaban 75%',
                'nilai_ph'            => 6.00,
                'catatan'             => 'Fase semai hari ke-6, rotasi ke peremajaan pada hari ke-15.',
                'created_at'          => Carbon::now()->subDays(6),
                'updated_at'          => Carbon::now(),
            ]
        );

        // 5. Riwayat Perpindahan Fase (Rotasi: Semai 14 hari -> Peremajaan s/d 21 hari -> Pendewasaan s/d panen 45-55 hari)
        if ($pengelolaan1->perpindahanFase()->count() === 0 && $faseSemai && $fasePeremajaan && $fasePendewasaan) {
            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $faseSemai->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(48)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(34)->toDateString(),
                'catatan'         => 'Penyemaian bibit (14 hari penuh)',
            ]);

            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $fasePeremajaan->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(34)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(27)->toDateString(),
                'catatan'         => 'Pindah ke meja peremajaan (hari ke-15 s/d 21, durasi 7 hari)',
            ]);

            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $fasePendewasaan->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(27)->toDateString(),
                'tanggal_selesai' => null,
                'catatan'         => 'Pindah ke meja pendewasaan (mulai umur 22 hari menuju panen fleksibel 45-55 hari)',
            ]);
        }

        if ($pengelolaan2->perpindahanFase()->count() === 0 && $faseSemai && $fasePeremajaan) {
            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan2->id_pengelolaan,
                'id_fase'         => $faseSemai->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(18)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(4)->toDateString(),
                'catatan'         => 'Selesai semai 14 hari',
            ]);

            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan2->id_pengelolaan,
                'id_fase'         => $fasePeremajaan->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(4)->toDateString(),
                'tanggal_selesai' => null,
                'catatan'         => 'Sedang di meja peremajaan (hari ke-18, sisa 3 hari menuju pendewasaan)',
            ]);
        }

        if ($pengelolaan3->perpindahanFase()->count() === 0 && $faseSemai) {
            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan3->id_pengelolaan,
                'id_fase'         => $faseSemai->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(6)->toDateString(),
                'tanggal_selesai' => null,
                'catatan'         => 'Sedang di meja semai (hari ke-6 dari 14 hari)',
            ]);
        }

        // 6. To-Do List Harian Pembudidaya
        if (ToDo::where('id_pembudidaya', $pembudidaya->id_pengguna)->count() === 0) {
            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan1->id_pengelolaan,
                'nama_tugas'     => 'Cek & Kalibrasi pH / EC Tandon Utama NFT 01 (Target pH 6.0-6.5, TDS 1050-1150 ppm)',
                'tanggal_tugas'  => Carbon::now()->toDateString(),
                'status'         => false,
                'created_at'     => Carbon::now(),
            ]);

            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan2->id_pengelolaan,
                'nama_tugas'     => 'Pembersihan Filter Spons & Pompa Modul DFT 02 Meja B',
                'tanggal_tugas'  => Carbon::now()->toDateString(),
                'status'         => true,
                'created_at'     => Carbon::now(),
            ]);

            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan3->id_pengelolaan,
                'nama_tugas'     => 'Pemberian Sinar Matahari Pagi 4 Jam untuk Bibit Semai',
                'tanggal_tugas'  => Carbon::now()->addDay()->toDateString(),
                'status'         => false,
                'created_at'     => Carbon::now(),
            ]);
        }

        // 7. Prediksi Panen AI (Siklus panen fleksibel 45-55 hari)
        if (PrediksiPanen::where('id_pengelolaan', $pengelolaan1->id_pengelolaan)->count() === 0) {
            PrediksiPanen::create([
                'id_pengelolaan'            => $pengelolaan1->id_pengelolaan,
                'status_kesiapan'           => PrediksiPanen::STATUS_SIAP,
                'perkiraan_tanggal_mulai'   => Carbon::now()->subDays(48)->addDays(45)->toDateString(),
                'perkiraan_tanggal_selesai' => Carbon::now()->subDays(48)->addDays(55)->toDateString(),
                'nilai_prediksi'            => 50.00,
                'created_at'                => Carbon::now(),
            ]);
        }

        // 8. Prediksi Permintaan AI
        if (PrediksiPermintaan::where('id_pembudidaya', $pembudidaya->id_pengguna)->count() === 0) {
            PrediksiPermintaan::create([
                'id_pembudidaya'   => $pembudidaya->id_pengguna,
                'periode_mulai'    => Carbon::now()->startOfMonth()->toDateString(),
                'periode_selesai'  => Carbon::now()->endOfMonth()->toDateString(),
                'tanggal_prediksi' => Carbon::now()->toDateString(),
                'hasil_prediksi'   => 350.00,
                'satuan'           => 'ikat',
                'created_at'       => Carbon::now(),
            ]);
        }

        // 9. Produk & Stok (Khusus Selada Hijau Segar - stok menyesuaikan panen budidaya)
        $produkSelada = Produk::firstOrCreate(
            ['nama_produk' => 'Selada Hijau Segar', 'id_pembudidaya' => $pembudidaya->id_pengguna],
            [
                'deskripsi'     => 'Selada hijau hidroponik super segar dipanen langsung dari modul instalasi Sepasang Petani Farm (Kebonsari, Sumbersari, Jember). Renyah, manis alami, dan 100% bebas pestisida kimia.',
                'harga'         => 15000,
                'foto_produk'   => null,
                'status_produk' => true,
            ]
        );

        // Stok 50 kg (sesuai hasil panen batch siap panen)
        Stok::updateOrInsert(
            ['id_produk' => $produkSelada->id_produk],
            [
                'jumlah_stok'    => 50.00,
                'tanggal_update' => Carbon::now(),
            ]
        );

        // Hapus produk lama selain Selada Hijau Segar agar hanya menjual Selada Hijau Segar
        Produk::where('id_pembudidaya', $pembudidaya->id_pengguna)
            ->where('nama_produk', '!=', 'Selada Hijau Segar')
            ->delete();

        // Akun pembeli tambahan untuk simulasi pesanan
        $pembeli2 = Pengguna::firstOrCreate(
            ['email' => 'maya@gmail.com'],
            [
                'nama'          => 'Maya Putri',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBELI,
                'no_telepon'    => '081234567890',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(2),
                'updated_at'    => Carbon::now(),
            ]
        );

        $pembeli3 = Pengguna::firstOrCreate(
            ['email' => 'agus@gmail.com'],
            [
                'nama'          => 'Agus Pratama',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBELI,
                'no_telepon'    => '081277788899',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(1),
                'updated_at'    => Carbon::now(),
            ]
        );

        // 10. Sample Pesanan & Transaksi (Data simulasi pembeli dan petani)
        if (Pesanan::whereHas('detailPesanan', fn($q) => $q->where('id_produk', $produkSelada->id_produk))->count() === 0) {
            $pesananData = [
                [
                    'pembeli' => $pembeli,
                    'tgl'     => Carbon::now()->subHours(2),
                    'jumlah'  => 3,
                    'metode'  => 'COD',
                    'status'  => 'Diproses',
                    'bayar'   => 'Belum Dibayar',
                ],
                [
                    'pembeli' => $pembeli2,
                    'tgl'     => Carbon::now()->subHours(5),
                    'jumlah'  => 2,
                    'metode'  => 'QRIS',
                    'status'  => 'Diproses',
                    'bayar'   => 'Sudah Dibayar',
                ],
                [
                    'pembeli' => $pembeli3,
                    'tgl'     => Carbon::now()->subDays(1),
                    'jumlah'  => 5,
                    'metode'  => 'Transfer Bank',
                    'status'  => 'Dikirim',
                    'bayar'   => 'Sudah Dibayar',
                ],
                [
                    'pembeli' => $pembeli,
                    'tgl'     => Carbon::now()->subDays(2),
                    'jumlah'  => 2,
                    'metode'  => 'COD',
                    'status'  => 'Selesai',
                    'bayar'   => 'Sudah Dibayar',
                ],
                [
                    'pembeli' => $pembeli2,
                    'tgl'     => Carbon::now()->subDays(3),
                    'jumlah'  => 4,
                    'metode'  => 'Transfer Bank',
                    'status'  => 'Dibatalkan',
                    'bayar'   => 'Belum Dibayar',
                ],
            ];

            foreach ($pesananData as $i => $item) {
                $subtotal = $item['jumlah'] * $produkSelada->harga;
                $ord = Pesanan::create([
                    'id_pembeli'        => $item['pembeli']->id_pengguna,
                    'tanggal_pesanan'   => $item['tgl'],
                    'total_harga'       => $subtotal,
                    'metode_pembayaran' => $item['metode'],
                    'status_pesanan'    => $item['status'],
                ]);

                DetailPesanan::create([
                    'id_pesanan'   => $ord->id_pesanan,
                    'id_produk'    => $produkSelada->id_produk,
                    'jumlah'       => $item['jumlah'],
                    'harga_satuan' => $produkSelada->harga,
                    'subtotal'     => $subtotal,
                ]);

                Pembayaran::create([
                    'id_pesanan'           => $ord->id_pesanan,
                    'id_pembudidaya'       => $pembudidaya->id_pengguna,
                    'metode_pembayaran'    => $item['metode'],
                    'status_pembayaran'    => $item['bayar'] === 'Sudah Dibayar' ? Pembayaran::STATUS_LUNAS : Pembayaran::STATUS_MENUNGGU,
                    'jumlah_bayar'         => $subtotal,
                    'order_id_gateway'     => 'ORD-' . date('Ymd') . '-' . sprintf('%03d', $ord->id_pesanan),
                    'id_transaksi_gateway' => 'TRX-' . rand(100000, 999999),
                    'waktu_pembayaran'     => $item['bayar'] === 'Sudah Dibayar' ? $item['tgl']->copy()->addMinutes(10) : null,
                ]);

                if ($item['status'] === 'Selesai') {
                    Ulasan::create([
                        'id_produk'      => $produkSelada->id_produk,
                        'id_pembeli'     => $item['pembeli']->id_pengguna,
                        'id_pesanan'     => $ord->id_pesanan,
                        'rating'         => 5,
                        'komentar'       => 'Selada hijaunya segar sekali dan bersih! Renyah mantap.',
                        'tanggal_ulasan' => Carbon::now()->subDay(),
                    ]);
                }
            }
        }

        // 11. Notifikasi Demo Terintegrasi API
        if (Notifikasi::where('id_pengguna', $pembudidaya->id_pengguna)->count() === 0) {
            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => $pengelolaan1->id_pengelolaan,
                'jenis_notifikasi' => Notifikasi::JENIS_PREDIKSI_PANEN,
                'isi_notifikasi'   => 'Batch BATCH-2026-001 (umur 48 hari) siap dipanen bertahap sesuai permintaan pasar (rentang panen 45-55 hari).',
                'status_dibaca'    => false,
                'waktu_notifikasi' => Carbon::now()->subMinutes(15),
            ]);

            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => null,
                'jenis_notifikasi' => 'Penjualan',
                'isi_notifikasi'   => 'Pesanan baru masuk dari Siti Rahmawati (3 kg Selada Hijau Segar, metode COD). Menunggu diproses.',
                'status_dibaca'    => false,
                'waktu_notifikasi' => Carbon::now()->subHours(2),
            ]);

            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => $pengelolaan2->id_pengelolaan,
                'jenis_notifikasi' => Notifikasi::JENIS_PENGINGAT_FASE,
                'isi_notifikasi'   => 'Pengingat: Batch BATCH-2026-002 telah berada di Fase Peremajaan selama 4 hari (umur 18 hari). Siapkan modul pendewasaan untuk hari ke-21.',
                'status_dibaca'    => true,
                'waktu_notifikasi' => Carbon::now()->subDays(1),
            ]);

            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => null,
                'jenis_notifikasi' => 'Pembayaran',
                'isi_notifikasi'   => 'Pembayaran QRIS untuk pesanan Maya Putri (2 kg Selada Hijau Segar) telah berhasil diverifikasi dan lunas.',
                'status_dibaca'    => true,
                'waktu_notifikasi' => Carbon::now()->subHours(5),
            ]);
        }
    }
}
