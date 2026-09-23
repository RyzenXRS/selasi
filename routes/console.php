<?php

use App\Jobs\HarvestReminderJob;
use App\Jobs\PhaseReminderJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Schedule daily automated lettuce cultivation jobs
Schedule::job(new PhaseReminderJob)->dailyAt('07:00');
Schedule::job(new HarvestReminderJob)->dailyAt('08:00');
