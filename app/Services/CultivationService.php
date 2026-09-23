<?php

namespace App\Services;

use App\Models\CultivationBatch;
use App\Models\CultivationCheck;
use App\Models\Harvest;
use App\Models\PhaseHistory;
use App\Models\User;
use Illuminate\Support\Str;

class CultivationService
{
    public function createBatch(User $user, array $data): CultivationBatch
    {
        $batchCode = 'BATCH-' . date('Ymd') . '-' . strtoupper(Str::random(4));

        return CultivationBatch::create([
            'user_id' => $user->id,
            'batch_code' => $batchCode,
            'seed_date' => $data['seed_date'],
            'plant_quantity' => $data['plant_quantity'],
            'current_phase' => $data['current_phase'],
            'location' => $data['location'] ?? null,
            'plant_condition' => $data['plant_condition'] ?? 'baik',
            'water_condition' => $data['water_condition'] ?? 'baik',
            'nutrition_condition' => $data['nutrition_condition'] ?? 'baik',
            'installation_condition' => $data['installation_condition'] ?? 'baik',
            'environment_condition' => $data['environment_condition'] ?? 'baik',
            'notes' => $data['notes'] ?? null,
            'status' => 'normal',
        ]);
    }

    public function updateBatch(CultivationBatch $batch, array $data): CultivationBatch
    {
        $batch->update($data);
        return $batch->fresh();
    }

    public function addCheck(CultivationBatch $batch, array $data): CultivationCheck
    {
        $check = $batch->checks()->create($data);

        // Auto update plant_condition and status in batch based on check data
        if (isset($data['plant_condition'])) {
            $batch->update(['plant_condition' => $data['plant_condition']]);
        }

        return $check;
    }

    public function changePhase(CultivationBatch $batch, array $data): PhaseHistory
    {
        $phaseHistory = $batch->phaseHistories()->create($data);

        $batch->update([
            'current_phase' => $data['next_phase'],
            'plant_quantity' => $data['plant_quantity'],
            'location' => $data['destination_location'] ?? $batch->location,
        ]);

        return $phaseHistory;
    }

    public function recordHarvest(CultivationBatch $batch, array $data): Harvest
    {
        $harvest = $batch->harvests()->create($data);

        $batch->update([
            'status' => 'harvested',
            'harvested_at' => now(),
        ]);

        return $harvest;
    }
}
