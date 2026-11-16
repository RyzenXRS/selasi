<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HarvestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $berat = (float) ($this->berat_panen ?? $this->berat_total_kg ?? 0);

        return [
            'id_panen'            => $this->id_panen,
            'id'                  => $this->id_panen,
            'id_pengelolaan'      => $this->id_pengelolaan,
            'batch_id'            => $this->id_pengelolaan,
            'tanggal_panen'       => $this->tanggal_panen?->format('Y-m-d'),
            'harvest_date'        => $this->tanggal_panen?->format('Y-m-d'),
            'jumlah_panen'        => $this->jumlah_panen,
            'quantity'            => $this->jumlah_panen,
            'berat_panen'         => $berat,
            'berat_total_kg'      => $berat,
            'total_weight'        => $berat,
            'kualitas'            => $this->kualitas,
            'kondisi_hasil_panen' => $this->kualitas,
            'quality'             => $this->kualitas,
            'catatan'             => $this->catatan,
            'notes'               => $this->catatan,
        ];
    }
}
