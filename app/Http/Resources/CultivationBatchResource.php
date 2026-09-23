<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CultivationBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'batch_code' => $this->batch_code,
            'seed_date' => $this->seed_date?->format('Y-m-d'),
            'plant_quantity' => $this->plant_quantity,
            'current_phase' => $this->current_phase,
            'location' => $this->location,
            'conditions' => [
                'plant' => $this->plant_condition,
                'water' => $this->water_condition,
                'nutrition' => $this->nutrition_condition,
                'installation' => $this->installation_condition,
                'environment' => $this->environment_condition,
            ],
            'notes' => $this->notes,
            'status' => $this->status,
            'harvested_at' => $this->harvested_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'latest_check' => new CultivationCheckResource($this->whenLoaded('checks', fn() => $this->checks->first())),
            'checks_count' => $this->whenCounted('checks'),
            'harvests_count' => $this->whenCounted('harvests'),
        ];
    }
}
