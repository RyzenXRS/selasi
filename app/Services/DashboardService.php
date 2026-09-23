<?php

namespace App\Services;

use App\Models\CultivationBatch;
use App\Models\Harvest;
use App\Models\Order;
use App\Models\Product;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;

class DashboardService
{
    public function getCultivatorDashboard(User $cultivator): array
    {
        $batches = CultivationBatch::where('user_id', $cultivator->id)->get();
        $activeBatches = $batches->where('status', '!=', 'harvested');

        $totalActivePlants = $activeBatches->sum('plant_quantity');

        // Phase distribution
        $phaseCounts = [
            'Semai' => $activeBatches->where('current_phase', 'Semai')->count(),
            'Vegetatif' => $activeBatches->where('current_phase', 'Vegetatif')->count(),
            'Pendewasaan' => $activeBatches->where('current_phase', 'Pendewasaan')->count(),
            'Panen' => $activeBatches->where('current_phase', 'Panen')->count(),
        ];

        // Harvest prediction estimate (rule-based estimate for non-AI dataset collection phase)
        // Average hydroponic lettuce cycle: ~35-42 days from seed
        $estimatedHarvests = $activeBatches->map(function ($batch) {
            $daysSinceSeed = Carbon::parse($batch->seed_date)->diffInDays(now());
            $estimatedHarvestDays = max(0, 40 - $daysSinceSeed);
            return [
                'batch_id' => $batch->id,
                'batch_code' => $batch->batch_code,
                'plant_quantity' => $batch->plant_quantity,
                'days_since_seed' => $daysSinceSeed,
                'estimated_days_to_harvest' => $estimatedHarvestDays,
                'estimated_harvest_date' => now()->addDays($estimatedHarvestDays)->format('Y-m-d'),
            ];
        })->values();

        // Tasks count
        $pendingTasksCount = Task::where('user_id', $cultivator->id)
            ->where('status', 'pending')
            ->count();

        // Products & Stock
        $productsCount = Product::where('user_id', $cultivator->id)->count();
        $totalStock = Product::where('user_id', $cultivator->id)->sum('stock');

        // Incoming orders
        $incomingOrdersCount = Order::where('cultivator_id', $cultivator->id)
            ->whereIn('order_status', ['waiting_payment', 'processing', 'ready_pickup'])
            ->count();

        $totalRevenue = Order::where('cultivator_id', $cultivator->id)
            ->where('order_status', 'completed')
            ->sum('total_price');

        return [
            'summary' => [
                'active_batches_count' => $activeBatches->count(),
                'total_active_plants' => $totalActivePlants,
                'pending_tasks_count' => $pendingTasksCount,
                'products_count' => $productsCount,
                'total_stock' => $totalStock,
                'incoming_orders_count' => $incomingOrdersCount,
                'total_revenue' => round($totalRevenue, 2),
            ],
            'phase_distribution' => $phaseCounts,
            'estimated_harvests' => $estimatedHarvests,
        ];
    }

    public function getBuyerDashboard(User $buyer): array
    {
        $orders = Order::where('buyer_id', $buyer->id)->get();

        $activeOrdersCount = $orders->whereIn('order_status', ['waiting_payment', 'processing', 'ready_pickup'])->count();
        $completedOrdersCount = $orders->where('order_status', 'completed')->count();
        $totalSpent = $orders->where('order_status', 'completed')->sum('total_price');

        return [
            'summary' => [
                'total_orders' => $orders->count(),
                'active_orders' => $activeOrdersCount,
                'completed_orders' => $completedOrdersCount,
                'total_spent' => round($totalSpent, 2),
            ],
            'recent_orders' => $orders->sortByDesc('created_at')->take(5)->values(),
        ];
    }
}
