<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeGoal;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\Payroll;
use App\Models\PerformanceReview;
use App\Models\SalaryHistory;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class HrController extends Controller
{
    public function overview()
    {
        $today = now()->toDateString();
        $month = now()->month;
        $year = now()->year;

        return response()->json([
            'total_employees' => Employee::count(),
            'active_employees' => Employee::where('status', 'Active')->count(),
            'inactive_employees' => Employee::where('status', 'Inactive')->count(),
            'present_today' => Attendance::whereDate('date', $today)->where('status', 'Present')->count(),
            'absent_today' => Attendance::whereDate('date', $today)->where('status', 'Absent')->count(),
            'late_today' => Attendance::whereDate('date', $today)->where('status', 'Late')->count(),
            'pending_leave_requests' => LeaveRequest::where('status', 'Pending')->count(),
            'approved_leave_this_month' => LeaveRequest::where('status', 'Approved')->whereMonth('start_date', $month)->whereYear('start_date', $year)->count(),
            'payroll_pending_approval' => Payroll::whereIn('approval_status', ['Draft', 'Prepared'])->count(),
            'payroll_paid_this_month' => Payroll::where('payment_status', 'Paid')->where('month', $month)->where('year', $year)->count(),
            'upcoming_holidays' => Holiday::whereDate('date', '>=', $today)->orderBy('date')->limit(5)->get(),
            'upcoming_performance_reviews' => PerformanceReview::with('employee')->whereDate('review_date', '>=', $today)->orderBy('review_date')->limit(5)->get(),
            'employees_by_department' => Department::withCount('employees')->get(),
            'leave_by_type' => LeaveRequest::select('leave_type', DB::raw('count(*) as total'))->groupBy('leave_type')->get(),
            'payroll_by_month' => Payroll::select('month', 'year', DB::raw('sum(net_salary) as total'))->groupBy('month', 'year')->orderBy('year')->orderBy('month')->get(),
        ]);
    }

    public function employees(Request $request)
    {
        return Employee::with(['department', 'user'])
            ->when($request->query('department_id'), fn ($query, $value) => $query->where('department_id', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('search'), fn ($query, $value) => $query->where('name', 'like', "%{$value}%")->orWhere('email', 'like', "%{$value}%"))
            ->latest()
            ->get();
    }

    public function storeEmployee(Request $request)
    {
        $data = $this->employeeData($request);
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;
        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('employee-photos', 'public');
        }

        $employee = Employee::create($data);
        $this->ensureLeaveBalance($employee, now()->year, 'Annual Leave', 21);
        $this->ensureLeaveBalance($employee, now()->year, 'Sick Leave', 10);

        return $employee->load(['department', 'user', 'leaveBalances']);
    }

    public function showEmployee(Employee $employee)
    {
        return $employee->load(['department', 'user', 'documents.uploader', 'attendances', 'leaveRequests', 'leaveBalances', 'payrolls.items', 'salaryHistories', 'performanceReviews', 'goals']);
    }

    public function updateEmployee(Request $request, Employee $employee)
    {
        $data = $this->employeeData($request, true);
        $data['updated_by'] = $request->user()?->id;
        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('employee-photos', 'public');
        }

        if (array_key_exists('monthly_salary', $data) && (float) $data['monthly_salary'] !== (float) $employee->monthly_salary) {
            SalaryHistory::create([
                'employee_id' => $employee->id,
                'old_salary' => $employee->monthly_salary,
                'new_salary' => $data['monthly_salary'],
                'effective_date' => now()->toDateString(),
                'reason' => $request->input('salary_change_reason', 'Salary updated'),
                'changed_by' => $request->user()?->id,
            ]);
        }

        $employee->update($data);

        return $employee->load(['department', 'user', 'salaryHistories']);
    }

    public function destroyEmployee(Employee $employee)
    {
        $employee->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }

    public function uploadEmployeeDocument(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'document_type' => 'required|string|max:255',
            'file' => 'required|file|max:10240',
        ]);

        $document = $employee->documents()->create([
            'title' => $data['title'],
            'document_type' => $data['document_type'],
            'file_path' => $request->file('file')->store('employee-documents', 'public'),
            'file_type' => $request->file('file')->getClientOriginalExtension(),
            'uploaded_by' => $request->user()?->id,
        ]);

        $this->notify('Employee document uploaded', $employee->name . ': ' . $document->title, 'employee_document_uploaded', '/hr/employees/' . $employee->id);

        return $document->load('uploader');
    }

    public function departments()
    {
        return Department::with(['manager', 'employees'])->latest()->get();
    }

    public function storeDepartment(Request $request)
    {
        return Department::create($request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]));
    }

    public function updateDepartment(Request $request, Department $department)
    {
        $department->update($request->validate([
            'name' => 'sometimes|required|string|max:255|unique:departments,name,' . $department->id,
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]));

        return $department;
    }

    public function destroyDepartment(Department $department)
    {
        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    public function attendances(Request $request)
    {
        return Attendance::with('employee.department')
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('date', '<=', $value))
            ->latest('date')
            ->get();
    }

    public function checkIn(Request $request)
    {
        $employee = $this->employeeForRequest($request);
        $time = now();
        $start = Setting::where('key', 'hr_start_time')->value('value') ?: '09:00';

        return Attendance::updateOrCreate([
            'employee_id' => $employee->id,
            'date' => $time->toDateString(),
        ], [
            'check_in' => $time->format('H:i:s'),
            'status' => $time->format('H:i') > $start ? 'Late' : 'Present',
            'method' => 'System',
            'created_by' => $request->user()?->id,
        ])->load('employee');
    }

    public function checkOut(Request $request)
    {
        $employee = $this->employeeForRequest($request);
        $attendance = Attendance::where('employee_id', $employee->id)->whereDate('date', now()->toDateString())->firstOrFail();
        $checkOut = now();
        $hours = $attendance->check_in ? Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->check_in)->floatDiffInHours($checkOut) : 0;
        $attendance->update(['check_out' => $checkOut->format('H:i:s'), 'total_hours' => round($hours, 2)]);

        return $attendance->load('employee');
    }

    public function manualAttendance(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'status' => 'required|in:Present,Late,Absent,Half Day,On Leave',
            'method' => 'nullable|in:Manual,QR,System',
            'notes' => 'nullable|string',
        ]);
        $data['created_by'] = $request->user()?->id;
        $data['total_hours'] = $this->hours($data['date'], $data['check_in'] ?? null, $data['check_out'] ?? null);

        return Attendance::updateOrCreate(['employee_id' => $data['employee_id'], 'date' => $data['date']], $data)->load('employee');
    }

    public function leaveRequests(Request $request)
    {
        return LeaveRequest::with(['employee.department', 'approver'])
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->latest()
            ->get();
    }

    public function storeLeaveRequest(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240',
        ]);
        if ($request->hasFile('attachment')) {
            $data['attachment'] = $request->file('attachment')->store('leave-attachments', 'public');
        }
        $data['total_days'] = $this->leaveDays($data['start_date'], $data['end_date']);
        $leave = LeaveRequest::create($data);
        $this->notify('New leave request submitted', $leave->employee->name . ' requested ' . $leave->leave_type, 'leave_request_submitted', '/hr/leave');

        return $leave->load('employee');
    }

    public function approveLeave(Request $request, LeaveRequest $leaveRequest)
    {
        $leaveRequest->update(['status' => 'Approved', 'approved_by' => $request->user()?->id, 'approved_at' => now(), 'rejected_at' => null]);
        $this->refreshLeaveBalance($leaveRequest);
        $this->notify('Leave approved', $leaveRequest->employee->name . ' leave approved', 'leave_approved', '/hr/leave');

        return $leaveRequest->load(['employee', 'approver']);
    }

    public function rejectLeave(Request $request, LeaveRequest $leaveRequest)
    {
        $data = $request->validate(['rejection_reason' => 'nullable|string']);
        $leaveRequest->update(['status' => 'Rejected', 'approved_by' => $request->user()?->id, 'rejected_at' => now(), 'rejection_reason' => $data['rejection_reason'] ?? null]);
        $this->notify('Leave rejected', $leaveRequest->employee->name . ' leave rejected', 'leave_rejected', '/hr/leave');

        return $leaveRequest->load(['employee', 'approver']);
    }

    public function leaveBalances(Request $request)
    {
        return LeaveBalance::with('employee.department')
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->where('year', $value))
            ->get();
    }

    public function holidays()
    {
        return Holiday::orderBy('date')->get();
    }

    public function storeHoliday(Request $request)
    {
        return Holiday::create($request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]));
    }

    public function payrolls(Request $request)
    {
        return Payroll::with(['employee.department', 'items'])
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->where('month', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->where('year', $value))
            ->latest()
            ->get();
    }

    public function generatePayroll(Request $request)
    {
        $data = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2100',
            'employee_id' => 'nullable|exists:employees,id',
            'bonus' => 'nullable|numeric|min:0',
            'overtime_amount' => 'nullable|numeric|min:0',
            'deduction' => 'nullable|numeric|min:0',
        ]);

        $employees = Employee::where('status', 'Active')->when($data['employee_id'] ?? null, fn ($query, $id) => $query->where('id', $id))->get();
        $generated = $employees->map(fn ($employee) => $this->makePayroll($employee, $data, $request->user()?->id));
        $this->notify('Payroll prepared', 'Payroll generated for ' . $data['month'] . '/' . $data['year'], 'payroll_prepared', '/hr/payroll');

        return $generated->load(['employee.department', 'items']);
    }

    public function approvePayroll(Request $request, Payroll $payroll)
    {
        $payroll->update(['approval_status' => 'Approved', 'approved_by' => $request->user()?->id]);
        $this->notify('Payroll approved', $payroll->employee->name . ' payroll approved', 'payroll_approved', '/hr/payroll');

        return $payroll->load('employee');
    }

    public function markPayrollPaid(Request $request, Payroll $payroll)
    {
        $data = $request->validate(['payment_method' => 'nullable|string|max:255', 'payment_date' => 'nullable|date']);
        $payroll->update(['payment_status' => 'Paid', 'approval_status' => 'Paid', 'payment_method' => $data['payment_method'] ?? 'bank transfer', 'payment_date' => $data['payment_date'] ?? now()->toDateString()]);
        $this->notify('Payroll paid', $payroll->employee->name . ' payroll marked paid', 'payroll_paid', '/hr/payroll');

        return $payroll->load('employee');
    }

    public function payslip(Request $request, Payroll $payroll)
    {
        if (! $request->user()) {
            $token = $request->query('token') ?: str_replace('Bearer ', '', $request->header('Authorization', ''));
            abort_unless($token && PersonalAccessToken::findToken($token), 401);
        }

        $payroll->load(['employee.department', 'items']);

        return response($this->payslipPdf($payroll))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="payslip-' . $payroll->employee->id . '-' . $payroll->month . '-' . $payroll->year . '.pdf"');
    }

    public function salaryHistories(Request $request)
    {
        return SalaryHistory::with('employee.department')->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))->latest()->get();
    }

    public function performanceReviews(Request $request)
    {
        return PerformanceReview::with('employee.department')->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))->latest()->get();
    }

    public function storePerformanceReview(Request $request)
    {
        $data = $request->validate($this->reviewRules());
        $data['reviewer_id'] = $request->user()?->id;
        $data['overall_rating'] = collect([$data['goals_score'], $data['quality_score'], $data['teamwork_score'], $data['punctuality_score'], $data['communication_score']])->avg();
        $review = PerformanceReview::create($data);
        $this->notify('Performance review created', $review->employee->name . ' review created', 'performance_review_created', '/hr/reviews');

        return $review->load('employee');
    }

    public function updatePerformanceReview(Request $request, PerformanceReview $performanceReview)
    {
        $data = $request->validate($this->reviewRules(true));
        if (isset($data['goals_score'])) {
            $data['overall_rating'] = collect([$data['goals_score'], $data['quality_score'], $data['teamwork_score'], $data['punctuality_score'], $data['communication_score']])->avg();
        }
        $performanceReview->update($data);

        return $performanceReview->load('employee');
    }

    public function employeeGoals(Request $request)
    {
        return EmployeeGoal::with('employee.department')->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))->latest()->get();
    }

    public function storeEmployeeGoal(Request $request)
    {
        $goal = EmployeeGoal::create($request->validate([
            'employee_id' => 'required|exists:employees,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_date' => 'nullable|date',
            'status' => 'nullable|in:Not Started,In Progress,Completed,Cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
            'manager_comment' => 'nullable|string',
        ]));
        $this->notify('Goal assigned', $goal->employee->name . ': ' . $goal->title, 'goal_assigned', '/hr/goals');

        return $goal->load('employee');
    }

    public function attendanceReport(Request $request)
    {
        return $this->attendances($request);
    }

    public function leaveReport(Request $request)
    {
        return $this->leaveRequests($request);
    }

    public function payrollReport(Request $request)
    {
        return $this->payrolls($request);
    }

    private function employeeData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'name' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'photo' => 'nullable|file|image|max:4096',
            'position' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'employment_start_date' => 'nullable|date',
            'contract_type' => 'nullable|string|max:255',
            'salary_grade' => 'nullable|string|max:255',
            'monthly_salary' => 'nullable|numeric|min:0',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive',
            'notes' => 'nullable|string',
            'salary_change_reason' => 'nullable|string',
        ]);
    }

    private function employeeForRequest(Request $request): Employee
    {
        if ($request->input('employee_id')) {
            return Employee::findOrFail($request->input('employee_id'));
        }

        return Employee::where('user_id', $request->user()?->id)->firstOrFail();
    }

    private function hours(string $date, ?string $checkIn, ?string $checkOut): float
    {
        if (! $checkIn || ! $checkOut) {
            return 0;
        }

        return round(Carbon::parse($date . ' ' . $checkIn)->floatDiffInHours(Carbon::parse($date . ' ' . $checkOut)), 2);
    }

    private function leaveDays(string $start, string $end): int
    {
        $startDate = Carbon::parse($start);
        $endDate = Carbon::parse($end);
        $holidays = Holiday::whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])->pluck('date')->map(fn ($date) => Carbon::parse($date)->toDateString())->all();
        $days = 0;
        while ($startDate->lte($endDate)) {
            if (! in_array($startDate->toDateString(), $holidays, true)) {
                $days++;
            }
            $startDate->addDay();
        }

        return $days;
    }

    private function ensureLeaveBalance(Employee $employee, int $year, string $type, int $allowed): LeaveBalance
    {
        return LeaveBalance::firstOrCreate(['employee_id' => $employee->id, 'year' => $year, 'leave_type' => $type], ['total_allowed_days' => $allowed, 'used_days' => 0, 'remaining_days' => $allowed]);
    }

    private function refreshLeaveBalance(LeaveRequest $leave): void
    {
        $balance = $this->ensureLeaveBalance($leave->employee, Carbon::parse($leave->start_date)->year, $leave->leave_type, $leave->leave_type === 'Annual Leave' ? 21 : 10);
        $used = LeaveRequest::where('employee_id', $leave->employee_id)->where('leave_type', $leave->leave_type)->where('status', 'Approved')->whereYear('start_date', $balance->year)->sum('total_days');
        $balance->update(['used_days' => $used, 'remaining_days' => max((float) $balance->total_allowed_days - (float) $used, 0)]);
    }

    private function makePayroll(Employee $employee, array $data, ?int $userId): Payroll
    {
        $attendances = Attendance::where('employee_id', $employee->id)->whereMonth('date', $data['month'])->whereYear('date', $data['year']);
        $base = (float) $employee->monthly_salary;
        $bonus = (float) ($data['bonus'] ?? 0);
        $overtime = (float) ($data['overtime_amount'] ?? 0);
        $deduction = (float) ($data['deduction'] ?? 0);

        return Payroll::updateOrCreate([
            'employee_id' => $employee->id,
            'month' => $data['month'],
            'year' => $data['year'],
        ], [
            'base_salary' => $base,
            'total_working_days' => $attendances->count(),
            'present_days' => (clone $attendances)->where('status', 'Present')->count(),
            'leave_days' => (clone $attendances)->where('status', 'On Leave')->count(),
            'absent_days' => (clone $attendances)->where('status', 'Absent')->count(),
            'late_days' => (clone $attendances)->where('status', 'Late')->count(),
            'overtime_amount' => $overtime,
            'bonus' => $bonus,
            'deduction' => $deduction,
            'net_salary' => $base + $bonus + $overtime - $deduction,
            'approval_status' => 'Prepared',
            'payment_status' => 'Unpaid',
            'prepared_by' => $userId,
        ]);
    }

    private function notify(string $title, string $message, string $type, string $link): void
    {
        Notification::create(['title' => $title, 'message' => $message, 'type' => $type, 'link' => $link, 'is_read' => false]);
    }

    private function reviewRules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes|' : '';

        return [
            'employee_id' => $required . 'required|exists:employees,id',
            'review_period' => 'nullable|string|max:255',
            'review_date' => 'nullable|date',
            'goals_score' => $required . 'required|integer|min:1|max:5',
            'quality_score' => $required . 'required|integer|min:1|max:5',
            'teamwork_score' => $required . 'required|integer|min:1|max:5',
            'punctuality_score' => $required . 'required|integer|min:1|max:5',
            'communication_score' => $required . 'required|integer|min:1|max:5',
            'manager_comments' => 'nullable|string',
            'employee_comments' => 'nullable|string',
            'training_needs' => 'nullable|string',
            'promotion_recommendation' => 'nullable|boolean',
            'status' => 'nullable|in:Draft,Submitted,Reviewed,Finalized',
        ];
    }

    private function payslipPdf(Payroll $payroll): string
    {
        $content = [];
        $logoPath = public_path('images/q-interior-logo.jpeg');
        $logo = is_file($logoPath) ? file_get_contents($logoPath) : null;
        if ($logo) {
            $content[] = 'q 76 0 0 76 46 720 cm /Im1 Do Q';
        }
        $this->pdfText($content, 'Q INTERIOR DESIGN STUDIO', 140, 770, 18, true);
        $this->pdfText($content, 'Payslip - ' . $payroll->month . '/' . $payroll->year, 140, 744, 12);
        $this->pdfText($content, 'Employee: ' . $payroll->employee->name, 46, 665, 12, true);
        $this->pdfText($content, 'Position: ' . ($payroll->employee->position ?: '-'), 46, 642, 10);
        $this->pdfText($content, 'Department: ' . ($payroll->employee->department?->name ?: '-'), 46, 624, 10);
        foreach ([
            'Base Salary' => $payroll->base_salary,
            'Bonus' => $payroll->bonus,
            'Overtime' => $payroll->overtime_amount,
            'Deduction' => $payroll->deduction,
            'Net Salary' => $payroll->net_salary,
        ] as $label => $value) {
            $y = 560 - (array_search($label, array_keys(['Base Salary' => 1, 'Bonus' => 1, 'Overtime' => 1, 'Deduction' => 1, 'Net Salary' => 1])) * 32);
            $this->pdfText($content, $label, 90, $y, 11, $label === 'Net Salary');
            $this->pdfText($content, '$' . number_format((float) $value, 2), 360, $y, 11, $label === 'Net Salary');
        }
        $this->pdfText($content, 'Payment Status: ' . $payroll->payment_status, 46, 330, 10);
        $this->pdfText($content, 'Payment Date: ' . ($payroll->payment_date?->format('Y-m-d') ?? '-'), 46, 310, 10);
        $this->pdfText($content, 'Authorized Signature: __________________________', 46, 210, 10);

        return $this->buildPdf(implode("\n", $content), $logo);
    }

    private function pdfText(array &$content, string $text, int $x, int $y, int $size = 10, bool $bold = false): void
    {
        $content[] = 'BT ' . ($bold ? '/F2' : '/F1') . ' ' . $size . ' Tf 0.10 0.12 0.16 rg ' . $x . ' ' . $y . ' Td (' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: '') . ') Tj ET';
    }

    private function buildPdf(string $pageContent, ?string $logo): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ' . ($logo ? '/XObject << /Im1 7 0 R >>' : '') . ' >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length ' . strlen($pageContent) . " >> stream\n" . $pageContent . "\nendstream endobj",
        ];
        if ($logo) {
            $objects[] = '7 0 obj << /Type /XObject /Subtype /Image /Width 500 /Height 500 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' . strlen($logo) . " >> stream\n" . $logo . "\nendstream endobj";
        }
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        for ($index = 1; $index <= count($objects); $index++) {
            $pdf .= str_pad((string) $offsets[$index], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }

        return $pdf . "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    }
}
