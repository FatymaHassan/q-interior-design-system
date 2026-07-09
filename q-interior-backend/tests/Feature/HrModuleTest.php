<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\LeaveBalance;
use App\Models\OfficeLocation;
use App\Models\Payroll;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HrModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_employee_leave_payroll_and_payslip_flow(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);

        $department = $this->postJson('/api/departments', [
            'name' => 'HR Test Department',
            'description' => 'Testing HR department',
            'status' => 'Active',
        ])->assertCreated()->json();

        $employee = $this->postJson('/api/employees', [
            'department_id' => $department['id'],
            'name' => 'HR Test Employee',
            'position' => 'Designer',
            'email' => 'hr-test@example.com',
            'monthly_salary' => 1500,
            'status' => 'Active',
        ])->assertCreated()->assertJsonFragment(['name' => 'HR Test Employee'])->json();

        $this->postJson('/api/attendances/manual', [
            'employee_id' => $employee['id'],
            'date' => now()->toDateString(),
            'check_in' => '09:00',
            'check_out' => '17:00',
            'status' => 'Present',
        ])->assertCreated()
            ->assertJsonFragment(['status' => 'Present'])
            ->assertJsonPath('date', now()->toDateString());

        $leave = $this->postJson('/api/leave-requests', [
            'employee_id' => $employee['id'],
            'leave_type' => 'Annual Leave',
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'reason' => 'Family matter',
        ])->assertCreated()->json();

        $this->postJson('/api/leave-requests/' . $leave['id'] . '/approve')
            ->assertOk()
            ->assertJsonFragment(['status' => 'Approved']);

        $this->assertDatabaseHas('leave_balances', [
            'employee_id' => $employee['id'],
            'leave_type' => 'Annual Leave',
            'used_days' => 2,
        ]);

        $this->postJson('/api/payrolls/generate', [
            'employee_id' => $employee['id'],
            'month' => now()->month,
            'year' => now()->year,
            'bonus' => 100,
            'deduction' => 25,
        ])->assertOk();

        $payroll = Payroll::firstOrFail();
        $this->assertSame('Prepared', $payroll->approval_status);
        $this->assertSame('1575.00', $payroll->net_salary);

        $token = $user->createToken('payslip-test')->plainTextToken;
        $this->get('/api/payrolls/' . $payroll->id . '/payslip?token=' . urlencode($token))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertSame(1, Department::count());
        $this->assertSame(1, Employee::count());
        $this->assertGreaterThan(0, LeaveBalance::count());
    }

    public function test_employee_created_with_password_can_login_to_employee_portal(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $employee = $this->postJson('/api/employees', [
            'name' => 'Portal Employee',
            'position' => 'Designer',
            'email' => 'portal-employee@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'monthly_salary' => 1200,
            'status' => 'Active',
        ])->assertCreated()->json();

        $this->assertDatabaseHas('employees', [
            'id' => $employee['id'],
            'email' => 'portal-employee@example.com',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'portal-employee@example.com',
            'role' => 'staff',
        ]);

        $this->postJson('/api/employee/login', [
            'email' => 'portal-employee@example.com',
            'password' => 'secret123',
        ])
            ->assertOk()
            ->assertJsonPath('employee.email', 'portal-employee@example.com')
            ->assertJsonStructure(['token']);
    }

    public function test_existing_employee_can_be_updated_with_portal_password_and_login(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $employee = $this->postJson('/api/employees', [
            'name' => 'Existing Employee',
            'position' => 'Designer',
            'email' => 'existing-employee@example.com',
            'monthly_salary' => 1200,
            'status' => 'Active',
        ])->assertCreated()->json();

        $this->post('/api/employees/' . $employee['id'], [
            '_method' => 'PUT',
            'name' => 'Existing Employee Updated',
            'email' => 'existing-employee@example.com',
            'password' => 'updated123',
            'password_confirmation' => 'updated123',
            'monthly_salary' => 1300,
            'status' => 'Active',
        ])->assertOk()->assertJsonFragment(['name' => 'Existing Employee Updated']);

        $this->postJson('/api/employee/login', [
            'email' => 'existing-employee@example.com',
            'password' => 'updated123',
        ])
            ->assertOk()
            ->assertJsonPath('employee.name', 'Existing Employee Updated')
            ->assertJsonStructure(['token']);
    }

    public function test_employee_portal_marks_late_employee_early_checkout(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        Employee::create([
            'user_id' => $user->id,
            'name' => 'Early Checkout Employee',
            'email' => $user->email,
            'status' => 'Active',
        ]);
        OfficeLocation::query()->update(['status' => 'Inactive']);
        foreach ([
            'attendance_office_name' => ['value' => 'Test Office', 'type' => 'string'],
            'attendance_office_latitude' => ['value' => '1.2345678', 'type' => 'number'],
            'attendance_office_longitude' => ['value' => '1.2345678', 'type' => 'number'],
            'attendance_allowed_radius_meters' => ['value' => '100', 'type' => 'number'],
            'working_hours_start' => ['value' => '08:00', 'type' => 'string'],
            'working_hours_end' => ['value' => '17:00', 'type' => 'string'],
            'hr_start_time' => ['value' => '08:15', 'type' => 'string'],
        ] as $key => $setting) {
            Setting::updateOrCreate(['key' => $key], $setting);
        }
        OfficeLocation::create([
            'name' => 'Test Office',
            'latitude' => 1.2345678,
            'longitude' => 1.2345678,
            'allowed_radius_meters' => 100,
            'work_start_time' => '08:00',
            'work_end_time' => '17:00',
            'late_threshold_time' => '08:15',
            'status' => 'Active',
        ]);

        Sanctum::actingAs($user);
        Carbon::setTestNow(Carbon::parse('2026-07-04 08:30:00', 'Africa/Mogadishu'));

        $this->postJson('/api/employee/attendance/check-in', [
            'latitude' => 1.2345678,
            'longitude' => 1.2345678,
        ])->assertOk()->assertJsonPath('attendance.date', '2026-07-04');

        $this->postJson('/api/employee/attendance/check-out', [
            'latitude' => 1.2345678,
            'longitude' => 1.2345678,
        ])->assertStatus(422)->assertJsonPath('message', 'Check out cannot be the same time as check in.');

        Carbon::setTestNow(Carbon::parse('2026-07-04 10:00:00', 'Africa/Mogadishu'));
        $this->postJson('/api/employee/attendance/check-out', [
            'latitude' => 1.2345678,
            'longitude' => 1.2345678,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Attendance accepted.')
            ->assertJsonPath('attendance.status', 'Late / Early Out')
            ->assertJsonPath('attendance.check_out', '10:00:00');

        Carbon::setTestNow();
    }

    public function test_admin_can_list_create_edit_and_delete_attendance_records(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $employee = Employee::create([
            'name' => 'Attendance Admin Employee',
            'email' => 'attendance-admin@example.com',
            'position' => 'Designer',
            'status' => 'Active',
        ]);

        $attendance = $this->postJson('/api/attendances/manual', [
            'employee_id' => $employee->id,
            'date' => '2026-07-09',
            'check_in' => '08:30',
            'check_out' => '17:15',
            'status' => 'Present',
            'method' => 'Manual',
        ])->assertCreated()
            ->assertJsonPath('employee.id', $employee->id)
            ->assertJsonPath('date', '2026-07-09')
            ->json();

        $this->getJson('/api/attendances')
            ->assertOk()
            ->assertJsonFragment(['id' => $attendance['id']]);

        $this->putJson('/api/attendances/' . $attendance['id'], [
            'employee_id' => $employee->id,
            'date' => '2026-07-09',
            'check_in' => '09:00',
            'check_out' => '17:00',
            'status' => 'Late',
            'method' => 'Manual',
            'notes' => 'Corrected by admin',
        ])->assertOk()
            ->assertJsonPath('check_in', '09:00')
            ->assertJsonPath('status', 'Late')
            ->assertJsonPath('notes', 'Corrected by admin');

        $this->deleteJson('/api/attendances/' . $attendance['id'])->assertOk();
        $this->assertSame(0, Attendance::where('employee_id', $employee->id)->whereDate('date', '2026-07-09')->count());
    }

    public function test_admin_and_employee_can_upload_and_download_employee_documents(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'admin']);
        $employeeUser = User::factory()->create(['role' => 'staff']);
        $employee = Employee::create([
            'user_id' => $employeeUser->id,
            'name' => 'Document Portal Employee',
            'email' => $employeeUser->email,
            'position' => 'Designer',
            'status' => 'Active',
        ]);

        Sanctum::actingAs($admin);
        $adminDocument = $this->postJson('/api/employees/' . $employee->id . '/documents', [
            'title' => 'Admin Uploaded Photo',
            'document_type' => 'Photo',
            'file' => UploadedFile::fake()->create('site-photo.jpg', 12, 'image/jpeg'),
        ])->assertCreated()
            ->assertJsonPath('title', 'Admin Uploaded Photo')
            ->assertJsonPath('file_type', 'image/jpeg')
            ->json();

        Storage::disk('public')->assertExists($adminDocument['file_path']);
        $this->getJson('/api/employees/' . $employee->id . '/documents/' . $adminDocument['id'] . '/download')->assertOk();

        Sanctum::actingAs($employeeUser);
        $employeeDocument = $this->postJson('/api/employee/documents', [
            'title' => 'Employee Design File',
            'document_type' => 'Design file',
            'file' => UploadedFile::fake()->create('joinery.dwg', 12, 'application/octet-stream'),
        ])->assertCreated()
            ->assertJsonPath('title', 'Employee Design File')
            ->json();

        Storage::disk('public')->assertExists($employeeDocument['file_path']);
        $this->getJson('/api/employee/documents')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Employee Design File']);
        $this->getJson('/api/employee/documents/' . $employeeDocument['id'] . '/download')->assertOk();
    }
}
