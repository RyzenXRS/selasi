<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pengelolaan' => ['nullable', 'exists:pengelolaan,id_pengelolaan'],
            'batch_id'       => ['nullable', 'exists:pengelolaan,id_pengelolaan'],
            'nama_tugas'     => ['required_without:title', 'string', 'max:150'],
            'title'          => ['required_without:nama_tugas', 'string', 'max:150'],
            'tanggal_tugas'  => ['nullable', 'date'],
            'task_date'      => ['nullable', 'date'],
            'status'         => ['nullable'],
        ];
    }
}
