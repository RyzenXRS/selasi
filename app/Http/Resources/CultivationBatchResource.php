<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CultivationBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_pengelolaan'      => $this->id_pengelolaan,
            'id'                  => $this->id_pengelolaan,
            'id_pembudidaya'      => $this->id_pembudidaya,
            'user_id'             => $this->id_pembudidaya,
            'kode_pengelolaan'    => $this->kode_pengelolaan,
            'batch_code'          => $this->kode_pengelolaan,
            'tanggal_tanam'       => $this->tanggal_tanam?->format('Y-m-d'),
            'seed_date'           => $this->tanggal_tanam?->format('Y-m-d'),
            'jumlah_tanaman'      => $this->jumlah_tanaman,
            'plant_quantity'      => $this->jumlah_tanaman,
            'lokasi'              => $this->lokasi,
            'location'            => $this->lokasi,
            'kondisi_tanaman'     => $this->kondisi_tanaman,
            'kondisi_air_nutrisi' => $this->kondisi_air_nutrisi,
            'kondisi_instalasi'   => $this->kondisi_instalasi,
            'kondisi_lingkungan'  => $this->kondisi_lingkungan,
            'nilai_ph'            => $this->nilai_ph,
            'catatan'             => $this->catatan,
            'notes'               => $this->catatan,
            'created_at'          => $this->created_at?->toIso8601String(),
            'updated_at'          => $this->updated_at?->toIso8601String(),
            'perpindahan_fase'    => PhaseHistoryResource::collection($this->whenLoaded('perpindahanFase')),
            'panen'               => HarvestResource::collection($this->whenLoaded('panen')),
            'prediksi_panen'      => $this->whenLoaded('prediksiPanen'),
        ];
    }
}
