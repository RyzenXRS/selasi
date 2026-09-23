<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StoreHarvestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'harvest_date' => ['required', 'date'],
            'quantity' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'min:0'],
            'condition' => ['required', 'string', 'in:sangat_baik,baik,cukup,buruk'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
