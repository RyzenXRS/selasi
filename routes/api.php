<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Smart Lettuce Cultivation & Marketplace System
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1 and use Sanctum token authentication.
|
*/

Route::prefix('v1')->group(function () {

    // ── Health Check ──────────────────────────────────────────────
    Route::get('/health', function () {
        return response()->json([
            'success'   => true,
            'message'   => 'Smart Lettuce API (Bahasa Indonesia ERD) is running',
            'version'   => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // ── Authentication ────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/register',        [\App\Http\Controllers\API\AuthController::class, 'register']);
        Route::post('/login',           [\App\Http\Controllers\API\AuthController::class, 'login']);
        Route::post('/forgot-password', [\App\Http\Controllers\API\AuthController::class, 'forgotPassword']);
    });

    // ── Public Catalog & Master Data ──────────────────────────────
    Route::get('/fase-budidaya', [\App\Http\Controllers\API\FaseBudidayaController::class, 'index']);
    Route::get('/products',      [\App\Http\Controllers\API\ProductController::class, 'index']);
    Route::get('/products/{id}', [\App\Http\Controllers\API\ProductController::class, 'show']);
    Route::get('/produk',        [\App\Http\Controllers\API\ProductController::class, 'index']);
    Route::get('/produk/{id}',   [\App\Http\Controllers\API\ProductController::class, 'show']);

    // ── Midtrans Payment Webhook Callback ────────────────────────
    Route::post('/midtrans/callback', [\App\Http\Controllers\API\MidtransController::class, 'callback']);
});

// ============================================================
// PROTECTED ROUTES (Requires Sanctum Token)
// ============================================================
Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {

    // ── Auth & Profile ────────────────────────────────────────
    Route::post('/auth/logout', [\App\Http\Controllers\API\AuthController::class, 'logout']);
    Route::get('/profile',      [\App\Http\Controllers\API\ProfileController::class, 'show']);
    Route::put('/profile',      [\App\Http\Controllers\API\ProfileController::class, 'update']);

    // ── Notifikasi ────────────────────────────────────────────
    Route::get('/notifications',           [\App\Http\Controllers\API\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\API\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all',  [\App\Http\Controllers\API\NotificationController::class, 'markAllAsRead']);

    // ============================================================
    // CULTIVATOR / PEMBUDIDAYA ROUTES
    // ============================================================
    Route::middleware(['role:cultivator,pembudidaya'])->group(function () {

        // Dashboard
        Route::get('/dashboard', [\App\Http\Controllers\API\DashboardController::class, 'cultivator']);

        // Pengelolaan / Batches
        Route::apiResource('batches', \App\Http\Controllers\API\CultivationBatchController::class);
        Route::apiResource('pengelolaan', \App\Http\Controllers\API\CultivationBatchController::class);

        // Perpindahan Fase
        Route::apiResource('batches.phases', \App\Http\Controllers\API\PhaseHistoryController::class)->shallow();
        Route::apiResource('pengelolaan.fase', \App\Http\Controllers\API\PhaseHistoryController::class)->shallow();

        // Panen
        Route::apiResource('batches.harvests', \App\Http\Controllers\API\HarvestController::class)->shallow();
        Route::apiResource('pengelolaan.panen', \App\Http\Controllers\API\HarvestController::class)->shallow();

        // Prediksi AI
        Route::get('/batches/{id}/prediksi-panen', [\App\Http\Controllers\API\PrediksiController::class, 'panen']);
        Route::get('/pengelolaan/{id}/prediksi-panen', [\App\Http\Controllers\API\PrediksiController::class, 'panen']);
        Route::get('/prediksi-permintaan',         [\App\Http\Controllers\API\PrediksiController::class, 'permintaan']);

        // To-Do List Harian
        Route::get('/tasks',                [\App\Http\Controllers\API\TaskController::class, 'index']);
        Route::post('/tasks',               [\App\Http\Controllers\API\TaskController::class, 'store']);
        Route::get('/tasks/{id}',           [\App\Http\Controllers\API\TaskController::class, 'show']);
        Route::put('/tasks/{id}',           [\App\Http\Controllers\API\TaskController::class, 'update']);
        Route::delete('/tasks/{id}',        [\App\Http\Controllers\API\TaskController::class, 'destroy']);
        Route::post('/tasks/{id}/complete', [\App\Http\Controllers\API\TaskController::class, 'complete']);

        Route::get('/to-do',                [\App\Http\Controllers\API\TaskController::class, 'index']);
        Route::post('/to-do',               [\App\Http\Controllers\API\TaskController::class, 'store']);
        Route::get('/to-do/{id}',           [\App\Http\Controllers\API\TaskController::class, 'show']);
        Route::put('/to-do/{id}',           [\App\Http\Controllers\API\TaskController::class, 'update']);
        Route::delete('/to-do/{id}',        [\App\Http\Controllers\API\TaskController::class, 'destroy']);
        Route::post('/to-do/{id}/complete', [\App\Http\Controllers\API\TaskController::class, 'complete']);

        // Kelola Produk Budidaya
        Route::post('/products',        [\App\Http\Controllers\API\ProductController::class, 'store']);
        Route::put('/products/{id}',    [\App\Http\Controllers\API\ProductController::class, 'update']);
        Route::delete('/products/{id}', [\App\Http\Controllers\API\ProductController::class, 'destroy']);
        Route::post('/produk',          [\App\Http\Controllers\API\ProductController::class, 'store']);
        Route::put('/produk/{id}',      [\App\Http\Controllers\API\ProductController::class, 'update']);
        Route::delete('/produk/{id}',   [\App\Http\Controllers\API\ProductController::class, 'destroy']);

        // Kelola Pesanan Masuk
        Route::get('/cultivator/orders',             [\App\Http\Controllers\API\OrderController::class, 'cultivatorOrders']);
        Route::put('/cultivator/orders/{id}/status', [\App\Http\Controllers\API\OrderController::class, 'updateStatus']);
    });

    // ============================================================
    // BUYER / PEMBELI ROUTES
    // ============================================================
    Route::middleware(['role:buyer,pembeli'])->group(function () {

        // Dashboard
        Route::get('/buyer/dashboard', [\App\Http\Controllers\API\DashboardController::class, 'buyer']);

        // Keranjang Belanja
        Route::get('/cart',                   [\App\Http\Controllers\API\CartController::class, 'index']);
        Route::post('/cart',                  [\App\Http\Controllers\API\CartController::class, 'addItem']);
        Route::put('/cart/items/{itemId}',    [\App\Http\Controllers\API\CartController::class, 'updateItem']);
        Route::delete('/cart/items/{itemId}', [\App\Http\Controllers\API\CartController::class, 'removeItem']);
        Route::delete('/cart',                [\App\Http\Controllers\API\CartController::class, 'clear']);

        Route::get('/keranjang',                   [\App\Http\Controllers\API\CartController::class, 'index']);
        Route::post('/keranjang',                  [\App\Http\Controllers\API\CartController::class, 'addItem']);
        Route::put('/keranjang/items/{itemId}',    [\App\Http\Controllers\API\CartController::class, 'updateItem']);
        Route::delete('/keranjang/items/{itemId}', [\App\Http\Controllers\API\CartController::class, 'removeItem']);
        Route::delete('/keranjang',                [\App\Http\Controllers\API\CartController::class, 'clear']);

        // Pesanan Pembeli
        Route::get('/orders',              [\App\Http\Controllers\API\OrderController::class, 'index']);
        Route::post('/orders/checkout',    [\App\Http\Controllers\API\OrderController::class, 'checkout']);
        Route::get('/orders/{id}',         [\App\Http\Controllers\API\OrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [\App\Http\Controllers\API\OrderController::class, 'cancel']);

        Route::get('/pesanan',              [\App\Http\Controllers\API\OrderController::class, 'index']);
        Route::post('/pesanan/checkout',    [\App\Http\Controllers\API\OrderController::class, 'checkout']);
        Route::get('/pesanan/{id}',         [\App\Http\Controllers\API\OrderController::class, 'show']);
        Route::post('/pesanan/{id}/cancel', [\App\Http\Controllers\API\OrderController::class, 'cancel']);

        // Ulasan Produk
        Route::get('/products/{productId}/reviews',  [\App\Http\Controllers\API\ReviewController::class, 'index']);
        Route::post('/products/{productId}/reviews', [\App\Http\Controllers\API\ReviewController::class, 'store']);
        Route::put('/reviews/{id}',                  [\App\Http\Controllers\API\ReviewController::class, 'update']);
        Route::delete('/reviews/{id}',               [\App\Http\Controllers\API\ReviewController::class, 'destroy']);

        Route::get('/produk/{productId}/ulasan',  [\App\Http\Controllers\API\ReviewController::class, 'index']);
        Route::post('/produk/{productId}/ulasan', [\App\Http\Controllers\API\ReviewController::class, 'store']);
        Route::put('/ulasan/{id}',                [\App\Http\Controllers\API\ReviewController::class, 'update']);
        Route::delete('/ulasan/{id}',             [\App\Http\Controllers\API\ReviewController::class, 'destroy']);
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
