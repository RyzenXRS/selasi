<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jumlah'   => ['required_without:quantity', 'integer', 'min:1'],
            'quantity' => ['required_without:jumlah', 'integer', 'min:1'],
        ];
    }
}
