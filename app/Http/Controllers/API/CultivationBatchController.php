<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StoreBatchRequest;
use App\Http\Requests\Cultivation\UpdateBatchRequest;
use App\Http\Resources\CultivationBatchResource;
use App\Models\Pengelolaan;
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
        $batches = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)
            ->with(['perpindahanFase.fase', 'panen', 'prediksiPanen'])
            ->orderBy('id_pengelolaan', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            CultivationBatchResource::collection($batches),
            'Daftar pengelolaan budidaya berhasil diambil.'
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
            'Pengelolaan budidaya berhasil dibuat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)
            ->with(['perpindahanFase.fase', 'panen', 'prediksiPanen', 'todoList'])
            ->findOrFail($id);

        return $this->successResponse(
            new CultivationBatchResource($batch),
            'Detail pengelolaan budidaya berhasil diambil.'
        );
    }

    public function update(UpdateBatchRequest $request, int $id): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);

        $updatedBatch = $this->cultivationService->updateBatch(
            $batch,
            $request->validated()
        );

        return $this->successResponse(
            new CultivationBatchResource($updatedBatch),
            'Pengelolaan budidaya berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);
        $batch->delete();

        return $this->noContentResponse('Pengelolaan budidaya berhasil dihapus.');
    }
}
