<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StorePhaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'previous_phase' => ['required', 'string', 'in:Semai,Vegetatif,Pendewasaan,Panen'],
            'next_phase' => ['required', 'string', 'in:Semai,Vegetatif,Pendewasaan,Panen'],
            'moved_date' => ['required', 'date'],
            'plant_quantity' => ['required', 'integer', 'min:1'],
            'destination_location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
