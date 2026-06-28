<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerformanceReview extends Model
{
    protected $fillable = ['employee_id', 'reviewer_id', 'review_period', 'review_date', 'goals_score', 'quality_score', 'teamwork_score', 'punctuality_score', 'communication_score', 'overall_rating', 'manager_comments', 'employee_comments', 'training_needs', 'promotion_recommendation', 'status'];

    protected function casts(): array
    {
        return [
            'review_date' => 'date:Y-m-d',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
