<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StoreCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_date' => ['required', 'date'],
            'plant_condition' => ['required', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'water_ph' => ['nullable', 'numeric', 'min:0', 'max:14'],
            'tds_ppm' => ['nullable', 'integer', 'min:0', 'max:5000'],
            'temperature' => ['nullable', 'numeric', 'min:-10', 'max:60'],
            'installation_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
