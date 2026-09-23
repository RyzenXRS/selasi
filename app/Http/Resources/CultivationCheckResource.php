<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CultivationCheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'batch_id' => $this->batch_id,
            'check_date' => $this->check_date?->format('Y-m-d'),
            'plant_condition' => $this->plant_condition,
            'water_ph' => $this->water_ph,
            'tds_ppm' => $this->tds_ppm,
            'temperature' => $this->temperature,
            'installation_condition' => $this->installation_condition,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
