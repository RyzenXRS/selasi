<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HarvestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_panen'       => $this->id_panen,
            'id'             => $this->id_panen,
            'id_pengelolaan' => $this->id_pengelolaan,
            'batch_id'       => $this->id_pengelolaan,
            'tanggal_panen'  => $this->tanggal_panen?->format('Y-m-d'),
            'harvest_date'   => $this->tanggal_panen?->format('Y-m-d'),
            'jumlah_panen'   => $this->jumlah_panen,
            'quantity'       => $this->jumlah_panen,
            'berat_panen'    => $this->berat_total_kg ?? $this->berat_panen,
            'berat_total_kg' => $this->berat_total_kg ?? $this->berat_panen,
            'total_weight'   => $this->berat_total_kg ?? $this->berat_panen,
            'kondisi_hasil_panen' => $this->kualitas,
            'kualitas'       => $this->kualitas,
            'quality'        => $this->kualitas,
            'catatan'        => $this->catatan,
            'notes'          => $this->catatan,
        ];
    }
}
