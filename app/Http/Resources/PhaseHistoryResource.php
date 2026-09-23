<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PhaseHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'batch_id' => $this->batch_id,
            'previous_phase' => $this->previous_phase,
            'next_phase' => $this->next_phase,
            'moved_date' => $this->moved_date?->format('Y-m-d'),
            'plant_quantity' => $this->plant_quantity,
            'destination_location' => $this->destination_location,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
