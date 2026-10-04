<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StoreHarvestRequest;
use App\Http\Resources\HarvestResource;
use App\Models\Panen;
use App\Models\Pengelolaan;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HarvestController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request, int $batchId): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($batchId);

        $harvests = $batch->panen()
            ->orderBy('tanggal_panen', 'desc')
            ->get();

        return $this->successResponse(
            HarvestResource::collection($harvests),
            'Data panen berhasil diambil.'
        );
    }

    public function store(StoreHarvestRequest $request, int $batchId): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($batchId);

        $harvest = $this->cultivationService->recordHarvest($batch, $request->validated());

        return $this->createdResponse(
            new HarvestResource($harvest),
            'Data panen berhasil dicatat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $harvest = Panen::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->findOrFail($id);

        return $this->successResponse(
            new HarvestResource($harvest),
            'Detail panen berhasil diambil.'
        );
    }

    public function update(StoreHarvestRequest $request, int $id): JsonResponse
    {
        $harvest = Panen::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->findOrFail($id);

        $harvest->update($request->validated());

        return $this->successResponse(
            new HarvestResource($harvest->fresh()),
            'Data panen berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $harvest = Panen::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->findOrFail($id);

        $harvest->delete();

        return $this->noContentResponse('Data panen berhasil dihapus.');
    }
}
