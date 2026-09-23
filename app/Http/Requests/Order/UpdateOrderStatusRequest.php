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
            'order_status' => ['sometimes', 'string', 'in:waiting_payment,processing,ready_pickup,completed,cancelled'],
            'payment_status' => ['sometimes', 'string', 'in:pending,paid,failed'],
            'cancellation_reason' => ['required_if:order_status,cancelled', 'nullable', 'string'],
        ];
    }
}
