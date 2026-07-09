import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { deleteEmployee } from "../../services/api";
import { EmployeeTable } from "./hrShared";
import useHrData from "./useHrData";

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const { employees, notice, reload } = useHrData(["employees"]);
  const confirm = useConfirmDialog();

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/hr/employees/add"><Button className="gap-2"><Plus size={16} />Add Employee</Button></Link></div>
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <Card className="p-5">
      <EmployeeTable
        employees={employees}
        onView={(employee) => navigate(`/hr/employees/${employee.id}`)}
        onEdit={(employee) => navigate(`/hr/employees/${employee.id}/edit`)}
        onDelete={async (employee) => {
          const ok = await confirm({
            title: "Delete employee?",
            message: `Delete ${employee.name} from the employee directory? This cannot be undone.`,
          });
          if (!ok) return;
          await deleteEmployee(employee.id);
          reload();
        }}
      />
    </Card>
  </div>;
}
