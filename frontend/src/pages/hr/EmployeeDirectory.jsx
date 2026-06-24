import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { deleteEmployee } from "../../services/api";
import { EmployeeTable, HRPageHeader } from "./hrShared";
import useHrData from "./useHrData";

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const { employees, notice, reload } = useHrData(["employees"]);

  return <div className="space-y-6">
    <HRPageHeader
      title="Employee Directory"
      description="Browse staff records, open professional employee profiles, and manage active or inactive employees."
      action={<Link to="/hr/employees/add"><Button className="gap-2"><Plus size={16} />Add Employee</Button></Link>}
    />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <Card className="p-5">
      <EmployeeTable
        employees={employees}
        onView={(employee) => navigate(`/hr/employees/${employee.id}`)}
        onEdit={(employee) => navigate(`/hr/employees/${employee.id}/edit`)}
        onDelete={async (employee) => {
          if (window.confirm(`Delete ${employee.name}?`)) {
            await deleteEmployee(employee.id);
            reload();
          }
        }}
      />
    </Card>
  </div>;
}
