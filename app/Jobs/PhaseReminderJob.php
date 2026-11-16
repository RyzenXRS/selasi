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

class PhaseReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Log::info('Running PhaseReminderJob check...');

        // Query active batches that haven't been harvested
        $batches = CultivationBatch::where('status', '!=', 'harvested')->get();

        foreach ($batches as $batch) {
            $daysInCurrentPhase = Carbon::parse($batch->updated_at)->diffInDays(now());

            // Phase transition heuristic:
            // Semai -> Vegetatif (~10-14 days)
            // Vegetatif -> Pendewasaan (~14-21 days)
            if ($batch->current_phase === 'Semai' && $daysInCurrentPhase >= 10) {
                $batch->update(['status' => 'near_phase_change']);
                Log::info("Batch {$batch->batch_code} is ready for Vegetatif phase.");
            } elseif ($batch->current_phase === 'Vegetatif' && $daysInCurrentPhase >= 14) {
                $batch->update(['status' => 'near_phase_change']);
                Log::info("Batch {$batch->batch_code} is ready for Pendewasaan phase.");
            }
        }
    }
}
