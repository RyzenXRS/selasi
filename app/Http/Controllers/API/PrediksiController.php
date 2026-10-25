<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Pengelolaan;
use App\Models\PrediksiPanen;
use App\Models\PrediksiPermintaan;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PrediksiController extends Controller
{
    use ApiResponse;

    /**
     * Get or calculate harvest prediction for a cultivation batch
     */
    public function panen(Request $request, int $batchId): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($batchId);

        $prediksi = PrediksiPanen::where('id_pengelolaan', $batch->id_pengelolaan)->latest()->first();

        if (!$prediksi) {
            // Kalkulasi cerdas berbasis umur tanam selada hidroponik (siklus 45-55 hari)
            $hariTanam = Carbon::parse($batch->tanggal_tanam)->diffInDays(Carbon::now());
            $targetHari = 48; // Umur panen ideal 45-55 hari
            $sisaHari = max(0, $targetHari - $hariTanam);

            $statusKesiapan = PrediksiPanen::STATUS_BELUM_SIAP;
            if ($hariTanam >= 45) {
                $statusKesiapan = PrediksiPanen::STATUS_SIAP;
            } elseif ($hariTanam >= 38) {
                $statusKesiapan = PrediksiPanen::STATUS_MENDEKATI_SIAP;
            }

            $prediksi = PrediksiPanen::create([
                'id_pengelolaan'            => $batch->id_pengelolaan,
                'status_kesiapan'           => $statusKesiapan,
                'perkiraan_tanggal_mulai'   => Carbon::parse($batch->tanggal_tanam)->addDays(45)->toDateString(),
                'perkiraan_tanggal_selesai' => Carbon::parse($batch->tanggal_tanam)->addDays(55)->toDateString(),
                'nilai_prediksi'            => round($batch->jumlah_tanaman * 0.20, 2), // ~200g per tanaman
                'created_at'                => Carbon::now(),
            ]);
        }

        return $this->successResponse(
            $prediksi->load('pengelolaan'),
            'Prediksi kesiapan panen berhasil didapatkan.'
        );
    }

    /**
     * Get demand forecasts for cultivator
     */
    public function permintaan(Request $request): JsonResponse
    {
        $userId = $request->user()->id_pengguna;

        $prediksiList = PrediksiPermintaan::where('id_pembudidaya', $userId)
            ->orderBy('id_prediksi_permintaan', 'desc')
            ->get();

        if ($prediksiList->isEmpty()) {
            // Buat prediksi AI default untuk bulan berjalan jika belum ada
            $prediksiDefault = PrediksiPermintaan::create([
                'id_pembudidaya'   => $userId,
                'periode_mulai'    => Carbon::now()->startOfMonth()->toDateString(),
                'periode_selesai'  => Carbon::now()->endOfMonth()->toDateString(),
                'tanggal_prediksi' => Carbon::now()->toDateString(),
                'hasil_prediksi'   => 300.00,
                'satuan'           => 'ikat',
                'created_at'       => Carbon::now(),
            ]);
            $prediksiList = collect([$prediksiDefault]);
        }

        return $this->successResponse(
            $prediksiList,
            'Prediksi permintaan pasar berhasil diambil.'
        );
    }
}
