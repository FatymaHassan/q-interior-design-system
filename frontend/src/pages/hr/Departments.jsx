import { useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { createDepartment } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Departments() {
  const { departments, notice, reload } = useHrData(["departments"]);
  const [departmentForm, setDepartmentForm] = useState({ name: "", description: "", status: "Active" });

  return <div className="space-y-6">
    <HRPageHeader title="Departments" description="Organize employees by department and keep the company structure clear." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Department Directory">
      <form onSubmit={async (e) => { e.preventDefault(); await createDepartment(departmentForm); setDepartmentForm({ name: "", description: "", status: "Active" }); reload(); }} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr_auto]">
        <input required placeholder="Department name" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} className={fieldInputClass} />
        <input placeholder="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} className={fieldInputClass} />
        <Button>Add Department</Button>
      </form>
      <Table columns={[
        { key: "name", label: "Department" },
        { key: "description", label: "Description" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "employees_count", label: "Employees", render: (row) => row.employees?.length || row.employees_count || 0 },
      ]} rows={departments} empty="No departments yet." />
    </SectionCard>
  </div>;
}
