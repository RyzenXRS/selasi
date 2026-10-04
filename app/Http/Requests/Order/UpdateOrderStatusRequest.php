<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status_pesanan'      => ['nullable', 'string'],
            'order_status'        => ['nullable', 'string'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }
}
