<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceAttemptLog;
use App\Models\AttendanceQrCode;
use App\Models\AttendanceScanLog;
use App\Models\Document;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeeGoal;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\OfficeLocation;
use App\Models\Payroll;
use App\Models\PerformanceReview;
use App\Models\Project;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmployeePortalController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $credentials['email'])->first();
        $employee = $user ? Employee::with('department')
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first() : null;

        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $employee) {
            throw ValidationException::withMessages(['email' => ['Employee portal access was not found for this account.']]);
        }

        $employee->forceFill(['portal_last_login_at' => now()])->save();

        return response()->json([
            'employee' => $employee,
            'token' => $user->createToken('employee-portal-token')->plainTextToken,
        ]);
    }

    public function me(Request $request)
    {
        return $this->employee($request)->load(['department', 'leaveBalances', 'goals', 'performanceReviews']);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function dashboard(Request $request)
    {
        $employee = $this->employee($request);
        $today = today()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();
        $attendances = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$monthStart, $monthEnd])->get();

        return response()->json([
            'employee' => $employee->load('department'),
            'today_attendance' => Attendance::where('employee_id', $employee->id)->whereDate('date', $today)->first(),
            'monthly_attendance' => $attendances,
            'attendance_summary' => $this->attendanceSummary($attendances, $monthStart, $monthEnd),
            'leave_balances' => LeaveBalance::where('employee_id', $employee->id)->where('year', now()->year)->get(),
            'leave_requests' => LeaveRequest::where('employee_id', $employee->id)->latest()->limit(5)->get(),
            'payslips' => Payroll::where('employee_id', $employee->id)->latest()->limit(6)->get(),
            'reviews' => PerformanceReview::where('employee_id', $employee->id)->latest()->limit(4)->get(),
            'goals' => EmployeeGoal::where('employee_id', $employee->id)->latest()->limit(6)->get(),
        ]);
    }

    public function scanAttendance(Request $request)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'qr_token' => 'required|string',
            'scan_type' => 'required|in:check_in,check_out',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'gps_accuracy_meters' => 'nullable|numeric|min:0',
        ]);

        $qr = AttendanceQrCode::with('officeLocation')->where('status', 'Active')->where('valid_until', '>=', now())->latest()->get()->first(fn ($item) => Hash::check($data['qr_token'], $item->token_hash));
        if (! $qr || ! $qr->officeLocation || $qr->officeLocation->status !== 'Active') {
            return $this->scanFailure($employee, null, null, $data, 'QR code expired or invalid.', $request);
        }

        $office = $qr->officeLocation;
        $distance = $this->distanceMeters((float) $office->latitude, (float) $office->longitude, (float) $data['latitude'], (float) $data['longitude']);
        if ($distance > (int) $office->allowed_radius_meters) {
            return $this->scanFailure($employee, $office, $qr, $data, $this->outsideOfficeMessage($distance, (int) $office->allowed_radius_meters), $request, $distance);
        }

        $attendance = Attendance::firstOrNew(['employee_id' => $employee->id, 'date' => today()->toDateString()]);
        if ($data['scan_type'] === 'check_in') {
            if ($attendance->exists && $attendance->check_in) {
                return $this->scanFailure($employee, $office, $qr, $data, 'Already checked in today.', $request, $distance);
            }
            $time = now();
            $lateThreshold = Carbon::parse(today()->toDateString() . ' ' . $office->late_threshold_time);
            $lateMinutes = $time->gt($lateThreshold) ? $lateThreshold->diffInMinutes($time) : 0;
            $attendance->fill([
                'office_location_id' => $office->id,
                'check_in' => $time->format('H:i:s'),
                'status' => $lateMinutes > 0 ? 'Late' : 'Present',
                'method' => 'QR',
                'check_in_latitude' => $data['latitude'],
                'check_in_longitude' => $data['longitude'],
                'check_in_distance_meters' => $distance,
                ...$this->attendanceLocationFields('check_in', $office, $data),
                'late_minutes' => $lateMinutes,
                'device_info' => $request->userAgent(),
            ])->save();
            $message = 'Attendance accepted.';
        } else {
            if (! $attendance->exists || ! $attendance->check_in) {
                return $this->scanFailure($employee, $office, $qr, $data, 'You must check in before check out.', $request, $distance);
            }
            if ($attendance->check_out) {
                return $this->scanFailure($employee, $office, $qr, $data, 'Already checked out today.', $request, $distance);
            }
            $now = now();
            $checkIn = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->check_in);
            $workEnd = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $office->work_end_time);
            if ($checkIn->greaterThanOrEqualTo($now)) {
                return $this->attemptFailure($employee, $office, $data['scan_type'], $data, 'Check out cannot be the same time as check in.', $request, $distance);
            }
            $earlyOut = $now->lt($workEnd);
            $attendance->fill([
                'check_out' => $now->format('H:i:s'),
                'total_hours' => round($checkIn->floatDiffInHours($now), 2),
                'status' => $this->checkoutStatus($attendance->status, $earlyOut),
                'check_out_latitude' => $data['latitude'],
                'check_out_longitude' => $data['longitude'],
                'check_out_distance_meters' => $distance,
                ...$this->attendanceLocationFields('check_out', $office, $data),
                'device_info' => $request->userAgent(),
            ])->save();
            $message = 'Attendance accepted.';
        }

        AttendanceScanLog::create($this->scanLog($employee, $office, $qr, $data, true, null, $request, $distance));
        Notification::create(['title' => $message, 'message' => $employee->name . ' ' . str_replace('_', ' ', $data['scan_type']), 'type' => 'attendance', 'module' => 'hr', 'is_read' => false]);

        return response()->json(['message' => $message, 'attendance' => $attendance->fresh(['employee', 'officeLocation']), 'debug' => $this->locationDebug($office, $data, $distance)]);
    }

    public function checkIn(Request $request)
    {
        return $this->portalAttendance($request, 'check_in');
    }

    public function checkOut(Request $request)
    {
        return $this->portalAttendance($request, 'check_out');
    }

    public function todayAttendance(Request $request)
    {
        return Attendance::with('officeLocation')
            ->where('employee_id', $this->employee($request)->id)
            ->whereDate('date', today())
            ->first() ?: response()->json(null);
    }

    public function attendanceAnalytics(Request $request)
    {
        $employee = $this->employee($request);
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();
        $rows = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get();

        return response()->json($this->attendanceSummary($rows, $start->toDateString(), $end->toDateString()));
    }

    public function attendance(Request $request)
    {
        return Attendance::with('officeLocation')->where('employee_id', $this->employee($request)->id)->latest('date')->get();
    }

    public function documents(Request $request)
    {
        return EmployeeDocument::with('uploader')
            ->where('employee_id', $this->employee($request)->id)
            ->latest()
            ->get();
    }

    public function projects(Request $request)
    {
        return Project::query()
            ->with('stage')
            ->latest()
            ->get();
    }

    public function projectDocuments(Request $request)
    {
        $query = Document::with(['project', 'uploader']);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        $this->applyDocumentKindFilter($query, $request->query('kind'));

        return $query->latest()->get();
    }

    public function storeProjectDocument(Request $request)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'document_category' => 'nullable|string|max:255',
            'visibility' => 'nullable|in:internal,client',
            'file' => 'required|file|max:102400',
        ]);

        $filePath = $request->file('file')->store('documents', 'public');
        abort_unless($filePath, 500, 'The file could not be saved. Please check storage permissions.');

        $document = Document::create([
            'project_id' => $data['project_id'],
            'title' => $data['title'],
            'document_category' => $data['document_category'] ?? 'Design File',
            'visibility' => $data['visibility'] ?? 'internal',
            'file_path' => $filePath,
            'file_type' => $request->file('file')->getClientMimeType(),
            'uploaded_by' => $request->user()?->id,
        ]);

        Notification::create([
            'project_id' => $document->project_id,
            'title' => 'Project document uploaded',
            'message' => $employee->name . ': ' . $document->title,
            'type' => 'project_document_uploaded',
            'module' => 'projects',
            'link' => '/projects/' . $document->project_id,
            'is_read' => false,
        ]);

        return $document->load(['project', 'uploader']);
    }

    public function downloadProjectDocument(Request $request, Document $document)
    {
        $this->employee($request);
        abort_unless($document->file_path && Storage::disk('public')->exists($document->file_path), 404);

        return Storage::disk('public')->download($document->file_path, basename($document->file_path), [
            'Content-Type' => $document->file_type ?: 'application/octet-stream',
        ]);
    }

    public function storeDocument(Request $request)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'document_type' => 'required|string|max:255',
            'file' => 'required|file|max:51200',
        ]);

        $document = $employee->documents()->create([
            'title' => $data['title'],
            'document_type' => $data['document_type'],
            'file_path' => $request->file('file')->store('employee-documents', 'public'),
            'file_type' => $request->file('file')->getClientMimeType(),
            'uploaded_by' => $request->user()?->id,
        ]);

        Notification::create([
            'title' => 'Employee document uploaded',
            'message' => $employee->name . ': ' . $document->title,
            'type' => 'employee_document_uploaded',
            'module' => 'hr',
            'link' => '/hr/employees/' . $employee->id,
            'is_read' => false,
        ]);

        return $document->load('uploader');
    }

    public function downloadDocument(Request $request, EmployeeDocument $employeeDocument)
    {
        abort_unless($employeeDocument->employee_id === $this->employee($request)->id, 404);
        abort_unless($employeeDocument->file_path && Storage::disk('public')->exists($employeeDocument->file_path), 404);

        return Storage::disk('public')->download($employeeDocument->file_path, basename($employeeDocument->file_path), [
            'Content-Type' => $employeeDocument->file_type ?: 'application/octet-stream',
        ]);
    }

    public function monthlyAttendance(Request $request)
    {
        $employee = $this->employee($request);
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();
        $rows = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get();

        return response()->json(['items' => $rows, 'summary' => $this->attendanceSummary($rows, $start->toDateString(), $end->toDateString())]);
    }

    public function leaveRequests(Request $request)
    {
        return LeaveRequest::where('employee_id', $this->employee($request)->id)->latest()->get();
    }

    public function storeLeaveRequest(Request $request)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'leave_type' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240',
        ]);
        $data['employee_id'] = $employee->id;
        $data['total_days'] = $this->leaveDays($data['start_date'], $data['end_date']);
        if ($request->hasFile('attachment')) {
            $data['attachment'] = $request->file('attachment')->store('leave-attachments', 'public');
        }

        $requestRecord = LeaveRequest::create($data);
        Notification::create(['title' => 'Leave request submitted', 'message' => $employee->name . ' requested ' . $data['leave_type'], 'type' => 'leave_request_submitted', 'module' => 'hr', 'link' => '/hr/leave', 'is_read' => false]);

        return $requestRecord->load('employee');
    }

    public function leaveBalances(Request $request)
    {
        return LeaveBalance::where('employee_id', $this->employee($request)->id)->latest('year')->get();
    }

    public function payslips(Request $request)
    {
        return Payroll::where('employee_id', $this->employee($request)->id)->latest()->get();
    }

    public function performanceReviews(Request $request)
    {
        $employee = $this->employee($request);

        return response()->json([
            'reviews' => PerformanceReview::where('employee_id', $employee->id)->latest()->get(),
            'goals' => EmployeeGoal::where('employee_id', $employee->id)->latest()->get(),
        ]);
    }

    private function employee(Request $request): Employee
    {
        return Employee::where('user_id', $request->user()?->id)->firstOrFail();
    }

    private function applyDocumentKindFilter($query, ?string $kind): void
    {
        if ($kind === 'photo') {
            $query->where(function ($builder) {
                $builder
                    ->where('document_category', 'Photo')
                    ->orWhere('file_type', 'like', 'image/%')
                    ->orWhere('file_path', 'regexp', '\\.(jpg|jpeg|png|gif|webp|bmp|svg)$');
            });
        }

        if ($kind === 'document') {
            $query->where(function ($builder) {
                $builder
                    ->whereNull('document_category')
                    ->orWhere('document_category', '!=', 'Photo');
            })->where(function ($builder) {
                $builder
                    ->whereNull('file_type')
                    ->orWhere('file_type', 'not like', 'image/%');
            })->where(function ($builder) {
                $builder
                    ->whereNull('file_path')
                    ->orWhere('file_path', 'not regexp', '\\.(jpg|jpeg|png|gif|webp|bmp|svg)$');
            });
        }
    }

    private function portalAttendance(Request $request, string $type)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'gps_accuracy_meters' => 'nullable|numeric|min:0',
        ]);

        if ($employee->status !== 'Active') {
            return $this->attemptFailure($employee, null, $type, $data, 'Your account is inactive.', $request);
        }

        $office = $this->attendanceOfficeLocation();
        if (! $office) {
            return $this->attemptFailure($employee, null, $type, $data, 'Office location is not configured.', $request);
        }

        $distance = $this->distanceMeters((float) $office->latitude, (float) $office->longitude, (float) $data['latitude'], (float) $data['longitude']);
        if ($distance > (int) $office->allowed_radius_meters) {
            return $this->attemptFailure($employee, $office, $type, $data, $this->outsideOfficeMessage($distance, (int) $office->allowed_radius_meters), $request, $distance);
        }

        $attendance = Attendance::firstOrNew(['employee_id' => $employee->id, 'date' => today()->toDateString()]);
        if ($type === 'check_in') {
            if ($attendance->exists && $attendance->check_in) {
                return $this->attemptFailure($employee, $office, $type, $data, 'You already checked in today.', $request, $distance);
            }

            $leave = LeaveRequest::where('employee_id', $employee->id)
                ->where('status', 'Approved')
                ->whereDate('start_date', '<=', today())
                ->whereDate('end_date', '>=', today())
                ->first();
            $time = now();
            $lateThreshold = Carbon::parse(today()->toDateString() . ' ' . $office->late_threshold_time);
            $lateMinutes = $time->gt($lateThreshold) ? $lateThreshold->diffInMinutes($time) : 0;
            $attendance->fill([
                'office_location_id' => $office->id,
                'check_in' => $time->format('H:i:s'),
                'status' => $leave ? 'On Leave' : ($lateMinutes > 0 ? 'Late' : 'Present'),
                'method' => 'Portal GPS',
                'check_in_latitude' => $data['latitude'],
                'check_in_longitude' => $data['longitude'],
                'check_in_distance_meters' => $distance,
                ...$this->attendanceLocationFields('check_in', $office, $data),
                'late_minutes' => $lateMinutes,
                'device_info' => $request->userAgent(),
            ])->save();
            $message = 'Attendance accepted.';
        } else {
            if (! $attendance->exists || ! $attendance->check_in) {
                return $this->attemptFailure($employee, $office, $type, $data, 'You must check in before check out.', $request, $distance);
            }
            if ($attendance->check_out) {
                return $this->attemptFailure($employee, $office, $type, $data, 'Already checked out today.', $request, $distance);
            }
            $now = now();
            $checkIn = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->check_in);
            $workEnd = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $office->work_end_time);
            if ($checkIn->greaterThanOrEqualTo($now)) {
                return $this->attemptFailure($employee, $office, $type, $data, 'Check out cannot be the same time as check in.', $request, $distance);
            }
            $earlyOut = $now->lt($workEnd);
            $attendance->fill([
                'check_out' => $now->format('H:i:s'),
                'total_hours' => round($checkIn->floatDiffInHours($now), 2),
                'status' => $this->checkoutStatus($attendance->status, $earlyOut),
                'check_out_latitude' => $data['latitude'],
                'check_out_longitude' => $data['longitude'],
                'check_out_distance_meters' => $distance,
                ...$this->attendanceLocationFields('check_out', $office, $data),
                'device_info' => $request->userAgent(),
            ])->save();
            $message = 'Attendance accepted.';
        }

        AttendanceAttemptLog::create($this->attemptLog($employee, $office, $type, $data, true, null, $request, $distance));
        Notification::create(['title' => $message, 'message' => $employee->name . ' ' . str_replace('_', ' ', $type), 'type' => 'attendance', 'module' => 'hr', 'is_read' => false]);

        return response()->json(['message' => $message, 'attendance' => $attendance->fresh(['employee', 'officeLocation']), 'debug' => $this->locationDebug($office, $data, $distance)]);
    }

    private function attemptFailure(Employee $employee, ?OfficeLocation $office, string $type, array $data, string $reason, Request $request, ?float $distance = null)
    {
        AttendanceAttemptLog::create($this->attemptLog($employee, $office, $type, $data, false, $reason, $request, $distance));

        return response()->json(['message' => $reason, 'debug' => $this->locationDebug($office, $data, $distance)], 422);
    }

    private function checkoutStatus(?string $currentStatus, bool $earlyOut): string
    {
        if (! $earlyOut || $currentStatus === 'On Leave') {
            return $currentStatus ?: 'Present';
        }

        return in_array($currentStatus, ['Late', 'Late / Early Out'], true) ? 'Late / Early Out' : 'Early Out';
    }

    private function attemptLog(Employee $employee, ?OfficeLocation $office, string $type, array $data, bool $success, ?string $reason, Request $request, ?float $distance): array
    {
        return [
            'employee_id' => $employee->id,
            'office_location_id' => $office?->id,
            'attempt_type' => $type,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'distance_meters' => $distance,
            'gps_accuracy_meters' => $data['gps_accuracy_meters'] ?? null,
            'office_latitude' => $office?->latitude,
            'office_longitude' => $office?->longitude,
            'allowed_radius_meters' => $office?->allowed_radius_meters,
            'is_location_valid' => $success,
            'success' => $success,
            'failure_reason' => $reason,
            'rejection_reason' => $success ? null : $reason,
            'device_info' => $request->userAgent(),
            'ip_address' => $request->ip(),
        ];
    }

    private function scanFailure(Employee $employee, ?OfficeLocation $office, ?AttendanceQrCode $qr, array $data, string $reason, Request $request, ?float $distance = null)
    {
        AttendanceScanLog::create($this->scanLog($employee, $office, $qr, $data, false, $reason, $request, $distance));

        return response()->json(['message' => $reason, 'debug' => $this->locationDebug($office, $data, $distance)], 422);
    }

    private function scanLog(Employee $employee, ?OfficeLocation $office, ?AttendanceQrCode $qr, array $data, bool $success, ?string $reason, Request $request, ?float $distance): array
    {
        return [
            'employee_id' => $employee->id,
            'office_location_id' => $office?->id,
            'attendance_qr_code_id' => $qr?->id,
            'scan_type' => $data['scan_type'],
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'distance_meters' => $distance,
            'is_location_valid' => $success,
            'success' => $success,
            'failure_reason' => $reason,
            'device_info' => $request->userAgent(),
            'ip_address' => $request->ip(),
        ];
    }

    private function attendanceSummary($attendances, string $start, string $end): array
    {
        $workingDays = $this->workingDays($start, $end);
        $present = $attendances->whereIn('status', ['Present', 'Early Out'])->count();
        $late = $attendances->whereIn('status', ['Late', 'Late / Early Out'])->count();
        $earlyOut = $attendances->whereIn('status', ['Early Out', 'Late / Early Out'])->count();
        $leave = $attendances->where('status', 'On Leave')->count();
        $absent = max($workingDays - $present - $late - $leave, 0);

        return [
            'working_days' => $workingDays,
            'present_days' => $present,
            'late_days' => $late,
            'early_out_days' => $earlyOut,
            'leave_days' => $leave,
            'absent_days' => $absent,
            'attendance_percentage' => $workingDays ? round((($present + $late) / $workingDays) * 100, 2) : 0,
            'late_percentage' => $workingDays ? round(($late / $workingDays) * 100, 2) : 0,
            'absence_percentage' => $workingDays ? round(($absent / $workingDays) * 100, 2) : 0,
        ];
    }

    private function workingDays(string $start, string $end): int
    {
        $date = Carbon::parse($start);
        $last = Carbon::parse($end);
        $holidays = Holiday::whereBetween('date', [$date->toDateString(), $last->toDateString()])->pluck('date')->map(fn ($day) => Carbon::parse($day)->toDateString())->all();
        $days = 0;
        while ($date->lte($last)) {
            if (! $date->isWeekend() && ! in_array($date->toDateString(), $holidays, true)) {
                $days++;
            }
            $date->addDay();
        }
        return $days;
    }

    private function leaveDays(string $start, string $end): int
    {
        return $this->workingDays($start, $end);
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return round($earth * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }

    public static function makeQrCode(?int $userId = null): array
    {
        $controller = app(self::class);
        $office = $controller->attendanceOfficeLocation();
        AttendanceQrCode::where('office_location_id', $office->id)->where('status', 'Active')->update(['status' => 'Revoked']);
        $token = Str::random(48);
        $qr = AttendanceQrCode::create([
            'office_location_id' => $office->id,
            'token_hash' => Hash::make($token),
            'valid_from' => now(),
            'valid_until' => now()->endOfDay(),
            'status' => 'Active',
            'created_by' => $userId,
        ]);

        return ['qr' => $qr->load('officeLocation'), 'token' => $token];
    }

    private function outsideOfficeMessage(float $distance, int $radius): string
    {
        return 'You are outside the allowed office location. Distance: ' . round($distance) . ' meters. Allowed radius: ' . $radius . ' meters.';
    }

    private function attendanceLocationFields(string $prefix, OfficeLocation $office, array $data): array
    {
        return [
            "{$prefix}_office_latitude" => $office->latitude,
            "{$prefix}_office_longitude" => $office->longitude,
            "{$prefix}_allowed_radius_meters" => $office->allowed_radius_meters,
            "{$prefix}_gps_accuracy_meters" => $data['gps_accuracy_meters'] ?? null,
        ];
    }

    private function locationDebug(?OfficeLocation $office, array $data, ?float $distance): array
    {
        return [
            'office_name' => $office?->name,
            'office_latitude' => $office?->latitude,
            'office_longitude' => $office?->longitude,
            'user_latitude' => $data['latitude'] ?? null,
            'user_longitude' => $data['longitude'] ?? null,
            'distance_meters' => $distance,
            'allowed_radius_meters' => $office?->allowed_radius_meters,
            'gps_accuracy_meters' => $data['gps_accuracy_meters'] ?? null,
        ];
    }

    private function attendanceOfficeLocation(): OfficeLocation
    {
        $settings = $this->attendanceLocationSettings();

        return OfficeLocation::updateOrCreate(
            ['name' => $settings['name']],
            [
                'latitude' => $settings['latitude'],
                'longitude' => $settings['longitude'],
                'allowed_radius_meters' => $settings['allowed_radius_meters'],
                'work_start_time' => Setting::where('key', 'working_hours_start')->value('value') ?: '08:00',
                'work_end_time' => Setting::where('key', 'working_hours_end')->value('value') ?: '17:00',
                'late_threshold_time' => Setting::where('key', 'hr_start_time')->value('value') ?: '08:15',
                'status' => 'Active',
            ]
        );
    }

    private function attendanceLocationSettings(): array
    {
        $defaults = [
            'attendance_office_name' => ['value' => 'Main Office', 'type' => 'string'],
            'attendance_office_latitude' => ['value' => '0', 'type' => 'number'],
            'attendance_office_longitude' => ['value' => '0', 'type' => 'number'],
            'attendance_allowed_radius_meters' => ['value' => '150', 'type' => 'number'],
        ];

        foreach ($defaults as $key => $setting) {
            Setting::firstOrCreate(['key' => $key], ['value' => $setting['value'], 'type' => $setting['type']]);
        }

        $values = Setting::whereIn('key', array_keys($defaults))->pluck('value', 'key');

        return [
            'name' => $values['attendance_office_name'] ?: 'Main Office',
            'latitude' => (float) ($values['attendance_office_latitude'] ?: 0),
            'longitude' => (float) ($values['attendance_office_longitude'] ?: 0),
            'allowed_radius_meters' => max(10, (int) ($values['attendance_allowed_radius_meters'] ?: 150)),
        ];
    }
}
