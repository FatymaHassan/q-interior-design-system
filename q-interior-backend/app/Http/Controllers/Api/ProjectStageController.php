<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectStage;

class ProjectStageController extends Controller
{
    public function index()
    {
        return ProjectStage::orderBy('order')->get();
    }
}
