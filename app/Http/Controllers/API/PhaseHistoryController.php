<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StorePhaseRequest;
use App\Http\Resources\PhaseHistoryResource;
use App\Models\Pengelolaan;
use App\Models\PerpindahanFase;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhaseHistoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request, int $batchId): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($batchId);

        $phases = $batch->perpindahanFase()
            ->with('fase')
            ->orderBy('tanggal_mulai', 'desc')
            ->get();

        return $this->successResponse(
            PhaseHistoryResource::collection($phases),
            'Riwayat perpindahan fase berhasil diambil.'
        );
    }

    public function store(StorePhaseRequest $request, int $batchId): JsonResponse
    {
        $batch = Pengelolaan::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($batchId);

        $phase = $this->cultivationService->recordPhaseTransition($batch, $request->validated());

        return $this->createdResponse(
            new PhaseHistoryResource($phase->load('fase')),
            'Perpindahan fase tanaman berhasil dicatat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $phase = PerpindahanFase::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->with('fase')->findOrFail($id);

        return $this->successResponse(
            new PhaseHistoryResource($phase),
            'Detail riwayat fase berhasil diambil.'
        );
    }

    public function update(StorePhaseRequest $request, int $id): JsonResponse
    {
        $phase = PerpindahanFase::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->findOrFail($id);

        $phase->update($request->validated());

        return $this->successResponse(
            new PhaseHistoryResource($phase->fresh()->load('fase')),
            'Data perpindahan fase berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $phase = PerpindahanFase::whereHas('pengelolaan', function ($q) use ($request) {
            $q->where('id_pembudidaya', $request->user()->id_pengguna);
        })->findOrFail($id);

        $phase->delete();

        return $this->noContentResponse('Riwayat perpindahan fase berhasil dihapus.');
    }
}
