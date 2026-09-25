<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'buyer' => new UserResource($this->whenLoaded('buyer')),
            'cultivator' => new UserResource($this->whenLoaded('cultivator')),
            'total_price' => $this->total_price,
            'delivery_address' => $this->delivery_address,
            'notes' => $this->notes,
            'payment' => [
                'method' => $this->payment_method,
                'type' => $this->payment_type,
                'status' => $this->payment_status,
                'paid_at' => $this->paid_at?->toIso8601String(),
                'proof' => $this->payment_proof ? asset('storage/' . $this->payment_proof) : null,
                'snap_token' => $this->snap_token,
                'snap_redirect_url' => $this->snap_redirect_url,
            ],
            'order_status' => $this->order_status,
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
