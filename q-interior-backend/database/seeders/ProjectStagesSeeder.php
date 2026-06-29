<?php

namespace Database\Seeders;

use App\Models\ProjectStage;
use Illuminate\Database\Seeder;

class ProjectStagesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->stages() as $stage) {
            ProjectStage::firstOrCreate(
                ['name' => $stage['name']],
                $stage
            );
        }
    }

    private function stages(): array
    {
        return [
            ['name' => 'Inquiry', 'order' => 1, 'color' => '#f59e0b'],
            ['name' => 'Design', 'order' => 2, 'color' => '#3b82f6'],
            ['name' => 'Materials Order', 'order' => 3, 'color' => '#8b5cf6'],
            ['name' => 'Installation', 'order' => 4, 'color' => '#14b8a6'],
            ['name' => 'Completed', 'order' => 5, 'color' => '#22c55e'],
        ];
    }
}
