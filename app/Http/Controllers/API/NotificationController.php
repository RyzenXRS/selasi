<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notifikasi;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $notifications = Notifikasi::where('id_pengguna', $request->user()->id_pengguna)
            ->orderBy('waktu_notifikasi', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            NotificationResource::collection($notifications),
            'Daftar notifikasi berhasil diambil.'
        );
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = Notifikasi::where('id_pengguna', $request->user()->id_pengguna)
            ->where('id_notifikasi', $id)
            ->firstOrFail();

        $notification->update(['status_dibaca' => true]);

        return $this->successResponse(
            new NotificationResource($notification),
            'Notifikasi ditandai sebagai sudah dibaca.'
        );
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        Notifikasi::where('id_pengguna', $request->user()->id_pengguna)
            ->where('status_dibaca', false)
            ->update(['status_dibaca' => true]);

        return $this->successResponse(null, 'Semua notifikasi ditandai sebagai sudah dibaca.');
    }
}
