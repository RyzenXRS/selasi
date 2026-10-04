<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'metode_pembayaran' => ['nullable', 'string'],
            'payment_method'    => ['nullable', 'string'],
        ];
    }
}
