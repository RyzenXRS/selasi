<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'seed_date' => ['sometimes', 'date'],
            'plant_quantity' => ['sometimes', 'integer', 'min:1'],
            'current_phase' => ['sometimes', 'string', 'in:Semai,Vegetatif,Pendewasaan,Panen'],
            'location' => ['nullable', 'string', 'max:255'],
            'plant_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'water_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'nutrition_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'installation_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'environment_condition' => ['nullable', 'string', 'in:sangat_baik,baik,cukup,buruk,kritis'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:normal,attention,near_phase_change,near_harvest,harvested'],
        ];
    }
}
