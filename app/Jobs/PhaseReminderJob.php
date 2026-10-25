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
            // Semai -> Peremajaan (sampai 14 hari)
            // Peremajaan -> Pendewasaan (hari ke-15 sampai 21 hari)
            // Pendewasaan -> Panen (hari ke-22 sampai 45-55 hari)
            if ($batch->current_phase === 'Semai' && $daysInCurrentPhase >= 14) {
                $batch->update(['status' => 'near_phase_change']);
                Log::info("Batch {$batch->batch_code} is ready for Peremajaan phase.");
            } elseif (($batch->current_phase === 'Peremajaan' || $batch->current_phase === 'Vegetatif') && $daysInCurrentPhase >= 7) {
                $batch->update(['status' => 'near_phase_change']);
                Log::info("Batch {$batch->batch_code} is ready for Pendewasaan phase.");
            } elseif ($batch->current_phase === 'Pendewasaan' && $daysInCurrentPhase >= 23) {
                $batch->update(['status' => 'near_harvest']);
                Log::info("Batch {$batch->batch_code} is approaching harvest (45-55 days).");
            }
        }
    }
}
