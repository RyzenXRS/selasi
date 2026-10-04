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
            'tanggal_tugas'  => ['required_without:task_date', 'date'],
            'task_date'      => ['required_without:tanggal_tugas', 'date'],
            'status'         => ['nullable'],
        ];
    }
}
