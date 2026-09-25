<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Smart Lettuce Cultivation Management System
|--------------------------------------------------------------------------
|
| All routes here are prefixed with /api and use the 'api' middleware group.
| Authentication uses Laravel Sanctum token-based auth.
|
*/

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

Route::prefix('v1')->group(function () {

    // Health check
    Route::get('/health', function () {
        return response()->json([
            'success' => true,
            'message' => 'Smart Lettuce CMS API is running',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // Authentication
    Route::prefix('auth')->group(function () {
        Route::post('/register', [\App\Http\Controllers\API\AuthController::class, 'register']);
        Route::post('/login',    [\App\Http\Controllers\API\AuthController::class, 'login']);
        Route::post('/forgot-password', [\App\Http\Controllers\API\AuthController::class, 'forgotPassword']);
    });

    // Public product catalog (buyers & guests can browse)
    Route::get('/products',      [\App\Http\Controllers\API\ProductController::class, 'index']);
    Route::get('/products/{id}', [\App\Http\Controllers\API\ProductController::class, 'show']);

    // Midtrans Payment Webhook Callback
    Route::post('/midtrans/callback', [\App\Http\Controllers\API\MidtransController::class, 'callback']);

});

// ============================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================

Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {

    // ── Auth ─────────────────────────────────────────────────
    Route::post('/auth/logout', [\App\Http\Controllers\API\AuthController::class, 'logout']);

    // ── Profile ──────────────────────────────────────────────
    Route::get('/profile',  [\App\Http\Controllers\API\ProfileController::class, 'show']);
    Route::put('/profile',  [\App\Http\Controllers\API\ProfileController::class, 'update']);

    // ── Notifications ─────────────────────────────────────────
    Route::get('/notifications',          [\App\Http\Controllers\API\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\API\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\API\NotificationController::class, 'markAllAsRead']);

    // ============================================================
    // CULTIVATOR ROUTES
    // ============================================================
    Route::middleware(['role:cultivator'])->group(function () {

        // ── Dashboard ─────────────────────────────────────────
        Route::get('/dashboard', [\App\Http\Controllers\API\DashboardController::class, 'cultivator']);

        // ── Cultivation Batches ───────────────────────────────
        Route::apiResource('batches', \App\Http\Controllers\API\CultivationBatchController::class);

        // ── Cultivation Checks (Monitoring) ───────────────────
        Route::apiResource('batches.checks', \App\Http\Controllers\API\CultivationCheckController::class)
            ->shallow();

        // ── Phase Histories ───────────────────────────────────
        Route::apiResource('batches.phases', \App\Http\Controllers\API\PhaseHistoryController::class)
            ->shallow();

        // ── Harvests ──────────────────────────────────────────
        Route::apiResource('batches.harvests', \App\Http\Controllers\API\HarvestController::class)
            ->shallow();

        // ── Tasks (To-do list) ────────────────────────────────
        Route::get('/tasks',                [\App\Http\Controllers\API\TaskController::class, 'index']);
        Route::post('/tasks',               [\App\Http\Controllers\API\TaskController::class, 'store']);
        Route::get('/tasks/{id}',           [\App\Http\Controllers\API\TaskController::class, 'show']);
        Route::put('/tasks/{id}',           [\App\Http\Controllers\API\TaskController::class, 'update']);
        Route::delete('/tasks/{id}',        [\App\Http\Controllers\API\TaskController::class, 'destroy']);
        Route::post('/tasks/{id}/complete', [\App\Http\Controllers\API\TaskController::class, 'complete']);

        // ── Cultivator Products ───────────────────────────────
        Route::post('/products',           [\App\Http\Controllers\API\ProductController::class, 'store']);
        Route::put('/products/{id}',       [\App\Http\Controllers\API\ProductController::class, 'update']);
        Route::delete('/products/{id}',    [\App\Http\Controllers\API\ProductController::class, 'destroy']);

        // ── Cultivator Orders (incoming) ──────────────────────
        Route::get('/cultivator/orders',             [\App\Http\Controllers\API\OrderController::class, 'cultivatorOrders']);
        Route::put('/cultivator/orders/{id}/status', [\App\Http\Controllers\API\OrderController::class, 'updateStatus']);
    });

    // ============================================================
    // BUYER ROUTES
    // ============================================================
    Route::middleware(['role:buyer'])->group(function () {

        // ── Dashboard ─────────────────────────────────────────
        Route::get('/buyer/dashboard', [\App\Http\Controllers\API\DashboardController::class, 'buyer']);

        // ── Cart ──────────────────────────────────────────────
        Route::get('/cart',                     [\App\Http\Controllers\API\CartController::class, 'index']);
        Route::post('/cart',                    [\App\Http\Controllers\API\CartController::class, 'addItem']);
        Route::put('/cart/items/{itemId}',      [\App\Http\Controllers\API\CartController::class, 'updateItem']);
        Route::delete('/cart/items/{itemId}',   [\App\Http\Controllers\API\CartController::class, 'removeItem']);
        Route::delete('/cart',                  [\App\Http\Controllers\API\CartController::class, 'clear']);

        // ── Orders ────────────────────────────────────────────
        Route::get('/orders',              [\App\Http\Controllers\API\OrderController::class, 'index']);
        Route::post('/orders/checkout',    [\App\Http\Controllers\API\OrderController::class, 'checkout']);
        Route::get('/orders/{id}',         [\App\Http\Controllers\API\OrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [\App\Http\Controllers\API\OrderController::class, 'cancel']);
        Route::post('/orders/{id}/pay',    [\App\Http\Controllers\API\OrderController::class, 'pay']);

        // ── Reviews ───────────────────────────────────────────
        Route::get('/products/{productId}/reviews',  [\App\Http\Controllers\API\ReviewController::class, 'index']);
        Route::post('/products/{productId}/reviews', [\App\Http\Controllers\API\ReviewController::class, 'store']);
        Route::put('/reviews/{id}',                  [\App\Http\Controllers\API\ReviewController::class, 'update']);
        Route::delete('/reviews/{id}',               [\App\Http\Controllers\API\ReviewController::class, 'destroy']);
    });
});

// ============================================================
// FALLBACK ROUTE
// ============================================================
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found.',
    ], 404);
});
