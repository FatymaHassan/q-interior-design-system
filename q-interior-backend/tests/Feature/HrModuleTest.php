<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\Payroll;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        ])->assertCreated()->assertJsonFragment(['status' => 'Present']);

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
}
