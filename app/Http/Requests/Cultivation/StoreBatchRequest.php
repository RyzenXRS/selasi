<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'seed_date' => ['required', 'date'],
            'plant_quantity' => ['required', 'integer', 'min:1'],
            'current_phase' => ['required', 'string', 'in:Semai,Vegetatif,Pendewasaan,Panen'],
            'location' => ['nullable', 'string', 'max:255'],
            'plant_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'water_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'nutrition_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'installation_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'environment_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
