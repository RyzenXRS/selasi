<?php

namespace App\Services;

use App\Models\Panen;
use App\Models\Pengelolaan;
use App\Models\Pengguna;
use App\Models\PerpindahanFase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CultivationService
{
    public function createBatch(Pengguna $pembudidaya, array $data): Pengelolaan
    {
        $batchCode = $data['kode_pengelolaan'] ?? $data['batch_code'] ?? ('BATCH-' . date('Ymd') . '-' . strtoupper(Str::random(4)));

        $pengelolaan = Pengelolaan::create([
            'id_pembudidaya'      => $pembudidaya->id_pengguna,
            'kode_pengelolaan'    => $batchCode,
            'tanggal_tanam'       => $data['tanggal_tanam'] ?? $data['seed_date'] ?? Carbon::now()->toDateString(),
            'jumlah_tanaman'      => $data['jumlah_tanaman'] ?? $data['plant_quantity'] ?? 100,
            'lokasi'              => $data['lokasi'] ?? $data['location'] ?? null,
            'kondisi_tanaman'     => $data['kondisi_tanaman'] ?? $data['plant_condition'] ?? 'Baik',
            'kondisi_air_nutrisi' => $data['kondisi_air_nutrisi'] ?? $data['water_condition'] ?? 'Baik',
            'kondisi_instalasi'   => $data['kondisi_instalasi'] ?? $data['installation_condition'] ?? 'Baik',
            'kondisi_lingkungan'  => $data['kondisi_lingkungan'] ?? $data['environment_condition'] ?? 'Baik',
            'nilai_ph'            => $data['nilai_ph'] ?? $data['water_ph'] ?? null,
            'catatan'             => $data['catatan'] ?? $data['notes'] ?? null,
            'created_at'          => Carbon::now(),
            'updated_at'          => Carbon::now(),
        ]);

        return $pengelolaan;
    }

    public function updateBatch(Pengelolaan $pengelolaan, array $data): Pengelolaan
    {
        $payload = [];
        $mappings = [
            'kode_pengelolaan'    => ['kode_pengelolaan', 'batch_code'],
            'tanggal_tanam'       => ['tanggal_tanam', 'seed_date'],
            'jumlah_tanaman'      => ['jumlah_tanaman', 'plant_quantity'],
            'lokasi'              => ['lokasi', 'location'],
            'kondisi_tanaman'     => ['kondisi_tanaman', 'plant_condition'],
            'kondisi_air_nutrisi' => ['kondisi_air_nutrisi', 'water_condition'],
            'kondisi_instalasi'   => ['kondisi_instalasi', 'installation_condition'],
            'kondisi_lingkungan'  => ['kondisi_lingkungan', 'environment_condition'],
            'nilai_ph'            => ['nilai_ph', 'water_ph'],
            'catatan'             => ['catatan', 'notes'],
        ];

        foreach ($mappings as $col => $keys) {
            foreach ($keys as $k) {
                if (array_key_exists($k, $data)) {
                    $payload[$col] = $data[$k];
                    break;
                }
            }
        }

        $payload['updated_at'] = Carbon::now();
        $pengelolaan->update($payload);

        return $pengelolaan->fresh();
    }

    public function recordPhaseTransition(Pengelolaan $pengelolaan, array $data): PerpindahanFase
    {
        return PerpindahanFase::create([
            'id_pengelolaan'  => $pengelolaan->id_pengelolaan,
            'id_fase'         => $data['id_fase'] ?? 1,
            'tanggal_mulai'   => $data['tanggal_mulai'] ?? $data['moved_date'] ?? Carbon::now()->toDateString(),
            'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
            'catatan'         => $data['catatan'] ?? $data['notes'] ?? null,
        ]);
    }

    public function recordHarvest(Pengelolaan $pengelolaan, array $data): Panen
    {
        return Panen::create([
            'id_pengelolaan' => $pengelolaan->id_pengelolaan,
            'tanggal_panen'  => $data['tanggal_panen'] ?? $data['harvest_date'] ?? Carbon::now()->toDateString(),
            'jumlah_panen'   => $data['jumlah_panen'] ?? $data['quantity'] ?? 0,
            'berat_total_kg' => $data['berat_total_kg'] ?? $data['total_weight_kg'] ?? 0,
            'kualitas'       => $data['kualitas'] ?? $data['quality'] ?? 'A',
            'catatan'        => $data['catatan'] ?? $data['notes'] ?? null,
        ]);
    }
}
