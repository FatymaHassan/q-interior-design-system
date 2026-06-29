import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import TemporaryPasswordNotice from "../../components/ui/TemporaryPasswordNotice";
import { createEmployee, getEmployee, updateEmployee } from "../../services/api";
import { formatDateOnly } from "../../utils/dateTime";
import { emptyEmployee, fieldInputClass, HRPageHeader } from "./hrShared";
import useHrData from "./useHrData";

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { departments, notice } = useHrData(["departments"]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [status, setStatus] = useState(isEdit ? "loading" : "ready");
  const [showPassword, setShowPassword] = useState(false);
  const [createdPassword, setCreatedPassword] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    getEmployee(id)
      .then((profile) => {
        setEmployeeForm({ ...emptyEmployee, ...profile.raw, department_id: profile.raw.department_id || "", employment_start_date: formatDateOnly(profile.raw.employment_start_date), photo: null });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id, isEdit]);

  useEffect(() => {
    setEmployeeForm((current) => ({ ...current, department_id: current.department_id || departments[0]?.id || "" }));
  }, [departments]);

  const saveEmployee = async (event) => {
    event.preventDefault();
    setError("");
    if (employeeForm.password && employeeForm.password !== employeeForm.password_confirmation) {
      setError("Employee portal passwords do not match.");
      return;
    }

    const payload = new FormData();
    Object.entries(employeeForm).forEach(([key, value]) => {
      if (key === "photo" && !(value instanceof File)) return;
      if (value !== null && value !== undefined && value !== "") payload.append(key, value);
    });
    payload.set("department_id", employeeForm.department_id || "");
    payload.set("monthly_salary", Number(employeeForm.monthly_salary || 0));
    const saved = isEdit ? await updateEmployee(id, payload) : await createEmployee(payload);
    if (!isEdit && employeeForm.password) {
      setCreatedPassword({ email: employeeForm.email, password: employeeForm.password, id: saved.id || id });
      setEmployeeForm(emptyEmployee);
      return;
    }
    navigate(`/hr/employees/${saved.id || id}`);
  };

  const departmentOptions = departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>);

  return <div className="space-y-6">
    <HRPageHeader
      title={isEdit ? "Edit Employee" : "Add Employee"}
      description={isEdit ? "Update employee profile, portal login, contract, salary, contact, and emergency information." : "Create a new employee profile with portal login, photo, role, department, contact, contract, and salary details."}
      action={<Link to="/hr/employees"><Button variant="outline">Back to List</Button></Link>}
    />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-brand-danger">{error}</p>}
    {createdPassword && <TemporaryPasswordNotice title="Employee portal password created" email={createdPassword.email} password={createdPassword.password} onClose={() => navigate(`/hr/employees/${createdPassword.id}`)} />}
    {status === "error" && <Card className="p-5 text-sm text-brand-danger">Employee could not be loaded.</Card>}
    {status !== "error" && <Card className="p-5 md:p-6">
      <form onSubmit={saveEmployee} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Name"><input required value={employeeForm.name || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Department"><select value={employeeForm.department_id || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value })} className={fieldInputClass}><option value="">No department</option>{departmentOptions}</select></FormField>
        <FormField label="Photo"><input type="file" accept="image/*" onChange={(e) => setEmployeeForm({ ...employeeForm, photo: e.target.files?.[0] || null })} className={fieldInputClass} /></FormField>
        <FormField label="Role / Position"><input value={employeeForm.position || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Monthly salary"><input type="number" value={employeeForm.monthly_salary || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, monthly_salary: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Contract type"><select value={employeeForm.contract_type || "Full Time"} onChange={(e) => setEmployeeForm({ ...employeeForm, contract_type: e.target.value })} className={fieldInputClass}><option>Full Time</option><option>Part Time</option><option>Contract</option><option>Temporary</option><option>Internship</option></select></FormField>
        <FormField label="Salary grade"><input value={employeeForm.salary_grade || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, salary_grade: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Employment start date"><input type="date" value={employeeForm.employment_start_date || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, employment_start_date: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Phone"><input value={employeeForm.phone || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Email"><input type="email" value={employeeForm.email || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} className={fieldInputClass} /></FormField>
        {isEdit && <FormField label="Portal access">
          <input value="Current password is kept unless you enter a new one" disabled className={`${fieldInputClass} bg-brand-soft font-semibold text-brand-muted`} />
        </FormField>}
        <FormField label={isEdit ? "New Password" : "Employee portal password"}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required={!isEdit}
              minLength={6}
              autoComplete="new-password"
              placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 6 characters"}
              value={employeeForm.password || ""}
              onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
              className={`${fieldInputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-soft hover:text-brand-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {isEdit && <p className="mt-1 text-xs font-semibold text-brand-muted">Leave blank to keep current password.</p>}
        </FormField>
        <FormField label={isEdit ? "Confirm New Password" : "Confirm employee portal password"}>
          <input
            type={showPassword ? "text" : "password"}
            required={!isEdit}
            minLength={6}
            autoComplete="new-password"
            placeholder={isEdit ? "Repeat new password" : "Repeat password"}
            value={employeeForm.password_confirmation || ""}
            onChange={(e) => setEmployeeForm({ ...employeeForm, password_confirmation: e.target.value })}
            className={fieldInputClass}
          />
        </FormField>
        <FormField label="Status"><select value={employeeForm.status || "Active"} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })} className={fieldInputClass}><option>Active</option><option>Inactive</option></select></FormField>
        <FormField label="Address"><input value={employeeForm.address || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Emergency contact 1"><input value={employeeForm.emergency_contact_name || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_name: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Emergency phone 1"><input value={employeeForm.emergency_contact_phone || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_phone: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Emergency contact 2"><input value={employeeForm.emergency_contact_2_name || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_2_name: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Emergency phone 2"><input value={employeeForm.emergency_contact_2_phone || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_2_phone: e.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Notes" className="md:col-span-2"><textarea value={employeeForm.notes || ""} onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })} className={fieldInputClass} /></FormField>
        <div className="flex gap-3 md:col-span-2">
          <Button>{isEdit ? "Update Employee" : "Save Employee"}</Button>
          <Link to="/hr/employees"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </Card>}
  </div>;
}
