<?php

namespace App\Jobs;

use App\Models\CultivationBatch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class HarvestReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Log::info('Running HarvestReminderJob check...');

        $batches = CultivationBatch::where('status', '!=', 'harvested')
            ->where('current_phase', 'Pendewasaan')
            ->get();

        foreach ($batches as $batch) {
            $daysSinceSeed = Carbon::parse($batch->seed_date)->diffInDays(now());

            // Hydroponic lettuce harvest window (~35+ days)
            if ($daysSinceSeed >= 35) {
                $batch->update(['status' => 'near_harvest']);
                Log::info("Batch {$batch->batch_code} is ready for harvest ({$daysSinceSeed} days since seed).");
            }
        }
    }
}
