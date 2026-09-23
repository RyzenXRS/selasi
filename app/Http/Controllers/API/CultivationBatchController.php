<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StoreBatchRequest;
use App\Http\Requests\Cultivation\UpdateBatchRequest;
use App\Http\Resources\CultivationBatchResource;
use App\Models\CultivationBatch;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CultivationBatchController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $batches = CultivationBatch::where('user_id', $request->user()->id)
            ->withCount(['checks', 'harvests'])
            ->with(['checks' => fn($q) => $q->latest()->limit(1)])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            CultivationBatchResource::collection($batches),
            'Daftar batch budidaya berhasil diambil.'
        );
    }

    public function store(StoreBatchRequest $request): JsonResponse
    {
        $batch = $this->cultivationService->createBatch(
            $request->user(),
            $request->validated()
        );

        return $this->createdResponse(
            new CultivationBatchResource($batch),
            'Batch budidaya berhasil dibuat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)
            ->with(['checks' => fn($q) => $q->orderBy('check_date', 'desc'), 'phaseHistories', 'harvests'])
            ->findOrFail($id);

        return $this->successResponse(
            new CultivationBatchResource($batch),
            'Detail batch budidaya berhasil diambil.'
        );
    }

    public function update(UpdateBatchRequest $request, int $id): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($id);

        $updatedBatch = $this->cultivationService->updateBatch(
            $batch,
            $request->validated()
        );

        return $this->successResponse(
            new CultivationBatchResource($updatedBatch),
            'Batch budidaya berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($id);
        $batch->delete();

        return $this->noContentResponse('Batch budidaya berhasil dihapus.');
    }
}
