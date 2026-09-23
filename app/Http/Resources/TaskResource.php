<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'batch_id' => $this->batch_id,
            'title' => $this->title,
            'description' => $this->description,
            'task_date' => $this->task_date?->format('Y-m-d'),
            'status' => $this->status,
            'priority' => $this->priority,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
