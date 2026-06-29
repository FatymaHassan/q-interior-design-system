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
use App\Models\OfficeLocation;
use App\Models\Payroll;
use App\Models\PerformanceReview;
use App\Models\SalaryHistory;
use App\Models\Setting;
use App\Models\User;
use App\Models\AttendanceQrCode;
use App\Models\AttendanceScanLog;
use App\Models\AttendanceAttemptLog;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
            'present_today' => Attendance::whereDate('date', $today)->whereIn('status', ['Present', 'Early Out'])->count(),
            'absent_today' => Attendance::whereDate('date', $today)->where('status', 'Absent')->count(),
            'late_today' => Attendance::whereDate('date', $today)->whereIn('status', ['Late', 'Late / Early Out'])->count(),
            'pending_leave_requests' => LeaveRequest::where('status', 'Pending')->count(),
            'approved_leave_this_month' => LeaveRequest::where('status', 'Approved')->whereMonth('start_date', $month)->whereYear('start_date', $year)->count(),
            'payroll_pending_approval' => Payroll::whereIn('approval_status', ['Draft', 'Prepared'])->count(),
            'payroll_paid_this_month' => Payroll::where('payment_status', 'Paid')->where('month', $month)->where('year', $year)->count(),
            'on_leave_today' => Attendance::whereDate('date', $today)->where('status', 'On Leave')->count(),
            'average_attendance_percentage' => $this->attendanceAnalytics($this->analyticsRequest($month, $year))->getData(true)['averages']['attendance_percentage'] ?? 0,
            'average_late_percentage' => $this->attendanceAnalytics($this->analyticsRequest($month, $year))->getData(true)['averages']['late_percentage'] ?? 0,
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
        $this->syncEmployeePortalUser($data);
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
        $this->syncEmployeePortalUser($data, $employee);
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

    public function resetEmployeePassword(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = $employee->user;
        if (! $user && $employee->email) {
            $user = User::where('email', $employee->email)->first();
        }

        if (! $employee->email) {
            return response()->json(['message' => 'Employee email is required before resetting portal password.'], 422);
        }

        if (! $user) {
            $user = User::create([
                'name' => $employee->name,
                'email' => $employee->email,
                'password' => Hash::make($data['password']),
                'role' => 'staff',
            ]);
            $employee->update(['user_id' => $user->id]);
        } else {
            $user->forceFill(['password' => Hash::make($data['password'])])->save();
        }

        $user->tokens()->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'reset_employee_portal_password',
            'module' => 'hr',
            'record_type' => Employee::class,
            'record_id' => $employee->id,
            'new_values' => ['employee_id' => $employee->id, 'email' => $employee->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return $employee->fresh(['department', 'user']);
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
        $end = Setting::where('key', 'hr_end_time')->value('value') ?: '17:00';
        $workEnd = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $end);
        $checkIn = $attendance->check_in ? Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->check_in) : null;

        if ($checkIn && $checkIn->greaterThanOrEqualTo($checkOut)) {
            return response()->json(['message' => 'Check out cannot be the same time as check in.'], 422);
        }
        $earlyOut = $checkOut->lt($workEnd);
        $hours = $checkIn ? $checkIn->floatDiffInHours($checkOut) : 0;
        $attendance->update([
            'check_out' => $checkOut->format('H:i:s'),
            'total_hours' => round($hours, 2),
            'status' => $this->checkoutStatus($attendance->status, $earlyOut),
        ]);

        return $attendance->load('employee');
    }

    public function manualAttendance(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'status' => 'required|in:Present,Late,Early Out,Late / Early Out,Absent,Half Day,On Leave',
            'method' => 'nullable|in:Manual,QR,System,Portal GPS',
            'notes' => 'nullable|string',
        ]);
        $data['created_by'] = $request->user()?->id;
        $end = Setting::where('key', 'hr_end_time')->value('value') ?: '17:00';
        if (! empty($data['check_in']) && ! empty($data['check_out'])) {
            $checkIn = Carbon::parse($data['date'] . ' ' . $data['check_in']);
            $checkOut = Carbon::parse($data['date'] . ' ' . $data['check_out']);
            $workEnd = Carbon::parse($data['date'] . ' ' . $end);
            if ($checkIn->greaterThanOrEqualTo($checkOut)) {
                return response()->json(['message' => 'Check out cannot be the same time as check in.'], 422);
            }
            if ($checkOut->lt($workEnd)) {
                $data['status'] = $this->checkoutStatus($data['status'], true);
            }
        }
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
        $this->markApprovedLeaveAttendance($leaveRequest);
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
        return $this->payrollQuery($request)->latest()->get();
    }

    public function exportPayrolls(Request $request)
    {
        $format = $request->query('format', 'excel');
        $rows = $this->payrollExportRows($request);
        $filename = 'payroll-export-' . now()->format('Ymd-His');

        if ($format === 'pdf') {
            return response($this->simplePayrollPdf('Payroll Export', $rows))
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '.pdf"');
        }

        return response($this->payrollCsv($rows))
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');
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
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
        ]);

        $employees = Employee::where('status', 'Active')->when($data['employee_id'] ?? null, fn ($query, $id) => $query->where('id', $id))->get();
        $generated = $employees->map(fn ($employee) => $this->makePayroll($employee, $data, $request->user()?->id));
        $this->notify('Payroll prepared', 'Payroll generated for ' . $data['month'] . '/' . $data['year'], 'payroll_prepared', '/finance/payroll');

        return $generated->load(['employee.department', 'items']);
    }

    public function approvePayroll(Request $request, Payroll $payroll)
    {
        $payroll->update(['approval_status' => 'Approved', 'approved_by' => $request->user()?->id]);
        $this->notify('Payroll approved', $payroll->employee->name . ' payroll approved', 'payroll_approved', '/finance/payroll');

        return $payroll->load('employee');
    }

    public function updatePayroll(Request $request, Payroll $payroll)
    {
        $data = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'month' => 'sometimes|required|integer|min:1|max:12',
            'year' => 'sometimes|required|integer|min:2020|max:2100',
            'bonus' => 'nullable|numeric|min:0',
            'overtime_amount' => 'nullable|numeric|min:0',
            'deduction' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|in:Unpaid,Paid',
            'approval_status' => 'nullable|in:Prepared,Approved,Paid',
            'payment_method' => 'nullable|string|max:255',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $employee = isset($data['employee_id']) ? Employee::findOrFail($data['employee_id']) : $payroll->employee;
        $base = (float) $employee->monthly_salary;
        $bonus = (float) ($data['bonus'] ?? $payroll->bonus ?? 0);
        $overtime = (float) ($data['overtime_amount'] ?? $payroll->overtime_amount ?? 0);
        $deduction = (float) ($data['deduction'] ?? $payroll->deduction ?? 0);
        if (! empty($data['payment_date']) && empty($data['payment_status'])) {
            $data['payment_status'] = 'Paid';
        }

        $payroll->update($data + [
            'employee_id' => $employee->id,
            'base_salary' => $base,
            'net_salary' => $base + $bonus + $overtime - $deduction,
        ]);

        return $payroll->load(['employee.department', 'items']);
    }

    public function destroyPayroll(Payroll $payroll)
    {
        $payroll->delete();

        return response()->json(['message' => 'Payroll deleted successfully']);
    }

    public function markPayrollPaid(Request $request, Payroll $payroll)
    {
        $data = $request->validate(['payment_method' => 'nullable|string|max:255', 'payment_date' => 'nullable|date']);
        $payroll->update(['payment_status' => 'Paid', 'approval_status' => 'Paid', 'payment_method' => $data['payment_method'] ?? 'bank transfer', 'payment_date' => $data['payment_date'] ?? now()->toDateString()]);
        $this->notify('Payroll paid', $payroll->employee->name . ' payroll marked paid', 'payroll_paid', '/finance/payroll');

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

    public function attendanceAnalytics(Request $request)
    {
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);
        $start = $request->query('start_date') ? Carbon::parse($request->query('start_date')) : Carbon::create($year, $month, 1)->startOfMonth();
        $end = $request->query('end_date') ? Carbon::parse($request->query('end_date')) : (clone $start)->endOfMonth();
        $employees = Employee::with('department')
            ->when($request->query('employee_id'), fn ($query, $id) => $query->where('id', $id))
            ->when($request->query('department_id'), fn ($query, $id) => $query->where('department_id', $id))
            ->where('status', 'Active')
            ->get();
        $workingDays = $this->workingDays($start->toDateString(), $end->toDateString());
        $rows = $employees->map(function ($employee) use ($start, $end, $workingDays) {
            $attendances = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get();
            $present = $attendances->whereIn('status', ['Present', 'Early Out'])->count();
            $late = $attendances->whereIn('status', ['Late', 'Late / Early Out'])->count();
            $earlyOut = $attendances->whereIn('status', ['Early Out', 'Late / Early Out'])->count();
            $leave = $attendances->where('status', 'On Leave')->count();
            $absent = max($workingDays - $present - $late - $leave, 0);
            return [
                'employee_id' => $employee->id,
                'employee' => $employee->name,
                'department' => $employee->department?->name,
                'total_working_days' => $workingDays,
                'present_days' => $present,
                'late_days' => $late,
                'early_out_days' => $earlyOut,
                'absent_days' => $absent,
                'leave_days' => $leave,
                'attendance_percentage' => $workingDays ? round((($present + $late) / $workingDays) * 100, 2) : 0,
                'late_percentage' => $workingDays ? round(($late / $workingDays) * 100, 2) : 0,
                'absence_percentage' => $workingDays ? round(($absent / $workingDays) * 100, 2) : 0,
            ];
        });

        return response()->json([
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'rows' => $rows,
            'averages' => [
                'attendance_percentage' => round($rows->avg('attendance_percentage') ?: 0, 2),
                'late_percentage' => round($rows->avg('late_percentage') ?: 0, 2),
                'absence_percentage' => round($rows->avg('absence_percentage') ?: 0, 2),
            ],
        ]);
    }

    public function weeklyAttendance(Request $request)
    {
        $start = $request->query('week') ? Carbon::parse($request->query('week'))->startOfWeek() : now()->startOfWeek();
        return $this->attendanceAnalytics(new Request(array_merge($request->query(), ['start_date' => $start->toDateString(), 'end_date' => (clone $start)->endOfWeek()->toDateString()])));
    }

    public function monthlyAttendance(Request $request)
    {
        return $this->attendanceAnalytics($request);
    }

    public function officeLocations()
    {
        return OfficeLocation::latest()->get();
    }

    public function storeOfficeLocation(Request $request)
    {
        return OfficeLocation::create($this->officeLocationData($request));
    }

    public function updateOfficeLocation(Request $request, OfficeLocation $officeLocation)
    {
        $officeLocation->update($this->officeLocationData($request, true));
        return $officeLocation;
    }

    public function currentQr()
    {
        $qr = AttendanceQrCode::with('officeLocation')->where('status', 'Active')->where('valid_until', '>=', now())->latest()->first();
        if (! $qr) {
            return response()->json(EmployeePortalController::makeQrCode(request()->user()?->id));
        }
        return response()->json(['qr' => $qr, 'token' => null]);
    }

    public function generateQr(Request $request)
    {
        return response()->json(EmployeePortalController::makeQrCode($request->user()?->id));
    }

    public function attemptLogs(Request $request)
    {
        return AttendanceAttemptLog::with(['employee', 'officeLocation'])
            ->when($request->query('employee_id'), fn ($query, $id) => $query->where('employee_id', $id))
            ->latest()
            ->limit(200)
            ->get();
    }

    private function employeeData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'name' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'photo' => 'nullable|file|image|max:4096',
            'position' => 'nullable|string|max:255',
            'specialty' => 'nullable|string|max:255',
            'daily_rate' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:6|max:255|confirmed',
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

    private function syncEmployeePortalUser(array &$data, ?Employee $employee = null): void
    {
        $password = $data['password'] ?? null;
        unset($data['password']);

        $email = $data['email'] ?? $employee?->email;
        if (! $email) {
            return;
        }

        $user = $employee?->user;
        if (! $user) {
            $user = User::where('email', $email)->first();
        }

        if (! $user && ! $password) {
            return;
        }

        $user ??= new User();
        $user->name = $data['name'] ?? $employee?->name ?? $user->name ?? $email;
        $user->email = $email;
        $user->role = $user->role ?: 'staff';

        if ($password) {
            $user->password = Hash::make($password);
        }

        $user->save();
        $data['user_id'] = $user->id;
    }

    private function employeeForRequest(Request $request): Employee
    {
        if ($request->input('employee_id')) {
            return Employee::findOrFail($request->input('employee_id'));
        }

        return Employee::where('user_id', $request->user()?->id)->firstOrFail();
    }

    private function checkoutStatus(?string $currentStatus, bool $earlyOut): string
    {
        if (! $earlyOut || $currentStatus === 'On Leave') {
            return $currentStatus ?: 'Present';
        }

        return in_array($currentStatus, ['Late', 'Late / Early Out'], true) ? 'Late / Early Out' : 'Early Out';
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
            'present_days' => (clone $attendances)->whereIn('status', ['Present', 'Early Out'])->count(),
            'leave_days' => (clone $attendances)->where('status', 'On Leave')->count(),
            'absent_days' => (clone $attendances)->where('status', 'Absent')->count(),
            'late_days' => (clone $attendances)->whereIn('status', ['Late', 'Late / Early Out'])->count(),
            'overtime_amount' => $overtime,
            'bonus' => $bonus,
            'deduction' => $deduction,
            'net_salary' => $base + $bonus + $overtime - $deduction,
            'approval_status' => 'Prepared',
            'payment_status' => isset($data['payment_date']) ? 'Paid' : 'Unpaid',
            'payment_date' => $data['payment_date'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'prepared_by' => $userId,
        ]);
    }

    private function payrollQuery(Request $request)
    {
        return Payroll::with(['employee.department', 'items'])
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->where('month', $value))
            ->when($request->query('month_from'), fn ($query, $value) => $query->where('month', '>=', $value))
            ->when($request->query('month_to'), fn ($query, $value) => $query->where('month', '<=', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->where('year', $value))
            ->when($request->query('approval_status'), fn ($query, $value) => $query->where('approval_status', $value))
            ->when($request->query('payment_status'), fn ($query, $value) => $query->where('payment_status', $value));
    }

    private function payrollExportRows(Request $request)
    {
        return $this->payrollQuery($request)->orderBy('year')->orderBy('month')->orderBy('employee_id')->get()->map(fn (Payroll $payroll) => [
            'employee' => $payroll->employee?->name,
            'department' => $payroll->employee?->department?->name,
            'month' => $payroll->month,
            'year' => $payroll->year,
            'monthly_salary' => round((float) $payroll->base_salary, 2),
            'bonus' => round((float) $payroll->bonus, 2),
            'overtime' => round((float) $payroll->overtime_amount, 2),
            'deduction' => round((float) $payroll->deduction, 2),
            'net_salary' => round((float) $payroll->net_salary, 2),
            'approval_status' => $payroll->approval_status,
            'payment_status' => $payroll->payment_status,
            'payment_date' => optional($payroll->payment_date)->toDateString(),
            'payment_method' => $payroll->payment_method,
        ]);
    }

    private function payrollCsv($rows): string
    {
        $rows = collect($rows)->map(fn ($row) => (array) $row);
        if ($rows->isEmpty()) {
            return "No records\n";
        }
        $headers = array_keys($rows->first());
        $lines = [implode(',', $headers)];
        foreach ($rows as $row) {
            $lines[] = implode(',', array_map(fn ($value) => '"' . str_replace('"', '""', is_scalar($value) ? (string) $value : json_encode($value)) . '"', array_values(array_intersect_key($row, array_flip($headers)))));
        }
        return implode("\n", $lines) . "\n";
    }

    private function simplePayrollPdf(string $title, $rows): string
    {
        $rows = collect($rows)->take(28)->map(fn ($row) => (array) $row)->values();
        $content = [];
        $this->payrollPdfText($content, 'Q INTERIOR DESIGN STUDIO', 42, 790, 16, true);
        $this->payrollPdfText($content, $title, 42, 760, 14, true);
        $this->payrollPdfText($content, 'Generated: ' . now()->format('Y-m-d H:i'), 42, 740, 9);
        $y = 710;
        foreach ($rows as $index => $row) {
            $line = ($index + 1) . '. ' . collect($row)->map(fn ($value, $key) => $key . ': ' . (is_scalar($value) ? $value : json_encode($value)))->implode(' | ');
            $this->payrollPdfText($content, mb_strimwidth($line, 0, 115, '...'), 42, $y, 8);
            $y -= 20;
        }
        if ($rows->isEmpty()) {
            $this->payrollPdfText($content, 'No payroll records found.', 42, $y, 10);
        }
        return $this->buildPayrollPdf(implode("\n", $content));
    }

    private function payrollPdfText(array &$content, string $text, int $x, int $y, int $size = 10, bool $bold = false): void
    {
        $content[] = 'BT ' . ($bold ? '/F2' : '/F1') . ' ' . $size . ' Tf 0.10 0.12 0.16 rg ' . $x . ' ' . $y . ' Td (' . $this->payrollPdfEscape($text) . ') Tj ET';
    }

    private function payrollPdfEscape(string $text): string
    {
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text ?: '');
    }

    private function buildPayrollPdf(string $pageContent): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length ' . strlen($pageContent) . " >> stream\n" . $pageContent . "\nendstream endobj",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= str_pad((string) $offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        return $pdf . "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
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

    private function officeLocationData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes|' : '';
        return $request->validate([
            'name' => $required . 'required|string|max:255',
            'latitude' => $required . 'required|numeric',
            'longitude' => $required . 'required|numeric',
            'allowed_radius_meters' => $required . 'required|integer|min:10|max:5000',
            'work_start_time' => $required . 'required|date_format:H:i',
            'work_end_time' => $required . 'required|date_format:H:i',
            'late_threshold_time' => $required . 'required|date_format:H:i',
            'status' => 'nullable|in:Active,Inactive',
        ]);
    }

    private function analyticsRequest(int $month, int $year): Request
    {
        return new Request(['month' => $month, 'year' => $year]);
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

    private function markApprovedLeaveAttendance(LeaveRequest $leaveRequest): void
    {
        $date = Carbon::parse($leaveRequest->start_date);
        $end = Carbon::parse($leaveRequest->end_date);
        while ($date->lte($end)) {
            if (! $date->isWeekend()) {
                Attendance::updateOrCreate(
                    ['employee_id' => $leaveRequest->employee_id, 'date' => $date->toDateString()],
                    ['status' => 'On Leave', 'method' => 'System', 'notes' => 'Approved ' . $leaveRequest->leave_type]
                );
            }
            $date->addDay();
        }
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
