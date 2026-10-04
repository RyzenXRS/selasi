<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pesanan' => ['required_without:order_id', 'integer', 'exists:pesanan,id_pesanan'],
            'order_id'   => ['required_without:id_pesanan', 'integer', 'exists:pesanan,id_pesanan'],
            'rating'     => ['required', 'integer', 'min:1', 'max:5'],
            'komentar'   => ['nullable', 'string'],
            'comment'    => ['nullable', 'string'],
        ];
    }
}
