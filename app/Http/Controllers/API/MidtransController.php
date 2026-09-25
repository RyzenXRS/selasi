<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Services\MidtransService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MidtransController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected MidtransService $midtransService
    ) {}

    /**
     * Webhook Notification Handler for Midtrans
     */
    public function callback(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            Log::info('Midtrans Notification Payload received', $payload);

            $order = $this->midtransService->handleNotification($payload);

            return $this->successResponse(
                new OrderResource($order),
                'Midtrans notification processed successfully.'
            );
        } catch (Exception $e) {
            Log::error('Midtrans Callback Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return $this->errorResponse(
                $e->getMessage(),
                400
            );
        }
    }
}
