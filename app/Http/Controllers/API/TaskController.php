<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $tasks = Task::where('user_id', $request->user()->id)
            ->when($request->get('status'), fn($q, $status) => $q->where('status', $status))
            ->when($request->get('date'), fn($q, $date) => $q->whereDate('task_date', $date))
            ->orderBy('task_date', 'asc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            TaskResource::collection($tasks),
            'Daftar tugas harian berhasil diambil.'
        );
    }

    public function store(TaskRequest $request): JsonResponse
    {
        $task = Task::create([
            'user_id' => $request->user()->id,
            'batch_id' => $request->batch_id,
            'title' => $request->title,
            'description' => $request->description,
            'task_date' => $request->task_date,
            'priority' => $request->priority ?? 'medium',
            'status' => $request->status ?? 'pending',
        ]);

        return $this->createdResponse(
            new TaskResource($task),
            'Tugas harian berhasil ditambahkan.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $task = Task::where('user_id', $request->user()->id)->findOrFail($id);

        return $this->successResponse(
            new TaskResource($task),
            'Detail tugas harian berhasil diambil.'
        );
    }

    public function update(TaskRequest $request, int $id): JsonResponse
    {
        $task = Task::where('user_id', $request->user()->id)->findOrFail($id);
        $task->update($request->validated());

        return $this->successResponse(
            new TaskResource($task->fresh()),
            'Tugas harian berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $task = Task::where('user_id', $request->user()->id)->findOrFail($id);
        $task->delete();

        return $this->noContentResponse('Tugas harian berhasil dihapus.');
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $task = Task::where('user_id', $request->user()->id)->findOrFail($id);

        $task->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return $this->successResponse(
            new TaskResource($task->fresh()),
            'Tugas harian telah diselesaikan.'
        );
    }
}
