<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->categories() as $category) {
            ExpenseCategory::firstOrCreate(
                ['name' => $category['name']],
                $category + ['status' => 'Active']
            );
        }
    }

    private function categories(): array
    {
        return [
            ['name' => 'Design Consultation', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => 'Design fees, drawings, renders, and consultation costs.'],
            ['name' => 'Site Visit', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => 'Site visit and measurement costs.'],
            ['name' => '3D Design', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => '3D design and rendering work.'],
            ['name' => 'Printing Drawings', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => 'Drawing and document printing.'],
            ['name' => 'Measurements', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => 'Measurement visits and related costs.'],
            ['name' => 'Materials', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Project material purchases and usage.'],
            ['name' => 'Paint', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Paint and coating materials.'],
            ['name' => 'Gypsum', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Gypsum and ceiling materials.'],
            ['name' => 'Tiles', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Tile materials.'],
            ['name' => 'Lighting', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Lighting fixtures and accessories.'],
            ['name' => 'Furniture', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Furniture and fit-out materials.'],
            ['name' => 'Labour', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Project labour and contractor work.'],
            ['name' => 'Carpenter', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Carpentry labour.'],
            ['name' => 'Painter', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Painting labour.'],
            ['name' => 'Electrician', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Electrical labour.'],
            ['name' => 'Mason', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Masonry labour.'],
            ['name' => 'Site Expenses', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Site petty cash and operations.'],
            ['name' => 'Transport', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Transport and site movement.'],
            ['name' => 'Fuel', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Fuel for site work.'],
            ['name' => 'Food for Workers', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Food and site refreshments for workers.'],
            ['name' => 'Equipment Rental', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Rented equipment and tools for project sites.'],
            ['name' => 'Other Project Costs', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Other Project Costs', 'description' => 'Other project-specific costs.'],
            ['name' => 'Office Rent', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Office rent and recurring company operating cost.'],
            ['name' => 'Utilities', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Electricity, internet, water, and utilities.'],
            ['name' => 'Office Supplies', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Office supplies and consumables.'],
            ['name' => 'Marketing', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Marketing and advertising costs.'],
            ['name' => 'Software Subscriptions', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Software and online subscriptions.'],
            ['name' => 'Bank Charges', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Bank charges and finance fees.'],
            ['name' => 'Employee Payroll', 'type' => 'payroll', 'expense_type' => 'payroll', 'group_name' => 'Payroll', 'description' => 'Salary and payroll expenses.'],
            ['name' => 'Materials Purchase', 'type' => 'inventory', 'expense_type' => 'inventory', 'group_name' => 'Inventory', 'description' => 'Inventory material purchases.'],
            ['name' => 'Tools', 'type' => 'inventory', 'expense_type' => 'inventory', 'group_name' => 'Inventory', 'description' => 'Tools and equipment purchases.'],
            ['name' => 'Stock Adjustment', 'type' => 'inventory', 'expense_type' => 'inventory', 'group_name' => 'Inventory', 'description' => 'Inventory stock adjustments.'],
            ['name' => 'Damaged Materials', 'type' => 'inventory', 'expense_type' => 'inventory', 'group_name' => 'Inventory', 'description' => 'Damaged inventory materials.'],
        ];
    }
}
