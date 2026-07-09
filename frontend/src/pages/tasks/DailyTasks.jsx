import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { approveTask, createTask, deleteTask, getEmployees, getProjects, getTaskDailySummary, getTasks, rejectTask, updateTaskStatus, uploadTaskAttachment } from "../../services/api";

const stageOptions = ["Inquiry", "Design", "Materials Order", "Installation", "Completed"];
const emptyTask = { project_id: "", employee_id: "", title: "", description: "", work_date: new Date().toISOString().slice(0, 10), related_stage: "Design", progress_added: "", priority: "Medium", status: "Pending", deadline: "", notes: "", admin_note: "", file: null };

export default function DailyTasks() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const confirm = useConfirmDialog();

  const load = () => Promise.all([getTasks(), getTaskDailySummary(), getProjects(), getEmployees({ status: "Active" })])
    .then(([taskData, summaryData, projectData, employeeData]) => {
      setTasks(taskData);
      setSummary(summaryData);
      setProjects(projectData);
      setEmployees(employeeData);
      setForm((current) => ({ ...current, project_id: current.project_id || projectData[0]?.id || "", employee_id: current.employee_id || employeeData[0]?.id || "" }));
    })
    .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => ({
    completed: summary?.completed_today?.length || 0,
    pending: (summary?.pending?.length || 0) + (summary?.in_progress?.length || 0),
    approved: summary?.approved?.length || 0,
    overdue: summary?.overdue?.length || 0,
  }), [summary]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateFile = (event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }));

  const submitTask = async (event) => {
    event.preventDefault();
    const task = await createTask({
      ...form,
      file: undefined,
      project_id: Number(form.project_id),
      employee_id: form.employee_id ? Number(form.employee_id) : null,
      progress_added: form.progress_added ? Number(form.progress_added) : 0,
      assigned_to: null,
      status: "Pending",
    });
    if (form.file) {
      await uploadTaskAttachment(task.id, form.file);
    }
    setForm((current) => ({ ...emptyTask, project_id: current.project_id, employee_id: current.employee_id }));
    load();
  };

  const changeStatus = async (task, status) => {
    await updateTaskStatus(task.id, status);
    load();
  };

  const approveWork = async (task) => {
    await approveTask(task.id, { progress_added: task.progressAdded, related_stage: task.raw?.related_stage || "", admin_note: task.adminNote });
    load();
  };

  const rejectWork = async (task) => {
    const adminNote = window.prompt("Reason for rejection?", task.adminNote || "");
    if (adminNote === null) return;
    await rejectTask(task.id, { admin_note: adminNote });
    load();
  };

  const removeTask = async (task) => {
    const ok = await confirm({
      title: "Delete task?",
      message: `Delete task "${task.title}"? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteTask(task.id);
    load();
  };

  return <div className="space-y-6">
    <div className="flex justify-end">
      <Button form="daily-work-form">Add Daily Work</Button>
    </div>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card className="p-4"><p className="text-sm text-brand-muted">Completed Today</p><b className="text-2xl">{counts.completed}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Pending / In Progress</p><b className="text-2xl">{counts.pending}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Approved Work</p><b className="text-2xl text-brand-success">{counts.approved}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Overdue</p><b className="text-2xl text-brand-danger">{counts.overdue}</b></Card>
    </section>

    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Daily Work Submission</h2>
      <form id="daily-work-form" onSubmit={submitTask} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Assigned employee"><select name="employee_id" value={form.employee_id} onChange={updateField} className={fieldInputClass}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.position}</option>)}</select></FormField>
        <FormField label="Work date"><input name="work_date" type="date" value={form.work_date} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Work title"><input name="title" value={form.title} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Related stage"><select name="related_stage" value={form.related_stage} onChange={updateField} className={fieldInputClass}>{stageOptions.map((stage) => <option key={stage}>{stage}</option>)}</select></FormField>
        <FormField label="Progress added"><input name="progress_added" type="number" min="0" max="100" step="0.01" value={form.progress_added} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Priority"><select name="priority" value={form.priority} onChange={updateField} className={fieldInputClass}><option>Low</option><option>Medium</option><option>High</option></select></FormField>
        <FormField label="Deadline"><input name="deadline" type="date" value={form.deadline} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Photo / file"><input type="file" onChange={updateFile} className={fieldInputClass} /></FormField>
        <FormField label="Description" className="lg:col-span-3"><textarea name="description" value={form.description} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button>Save Daily Work</Button></div>
      </form>
    </Card>

    <Card className="p-5">
      <h2 className="mb-4 text-xl font-bold">Daily Work List</h2>
      <Table
        columns={[
          { key: "title", label: "Work", render: (task) => <Link to={`/tasks/${task.id}`} className="font-bold text-brand-primary hover:underline">{task.title}</Link> },
          { key: "project", label: "Project" },
          { key: "assignee", label: "Assigned To" },
          { key: "workDate", label: "Work Date" },
          { key: "relatedStage", label: "Stage" },
          { key: "progressAdded", label: "Progress", render: (task) => `${task.progressAdded || 0}%` },
          { key: "priority", label: "Priority", render: (task) => <Badge>{task.priority}</Badge> },
          { key: "status", label: "Status", render: (task) => <Badge>{task.status}</Badge> },
          { key: "actions", label: "Actions", render: (task) => <div className="flex flex-wrap gap-2">
            {task.status === "Pending" && <Button variant="outline" className="px-3 py-2" onClick={() => approveWork(task)}>Approve</Button>}
            {task.status === "Pending" && <Button variant="outline" className="px-3 py-2" onClick={() => rejectWork(task)}>Reject</Button>}
            {task.status === "Pending" && <Button variant="outline" className="px-3 py-2" onClick={() => changeStatus(task, "In Progress")}>Start</Button>}
            <Link to={`/tasks/${task.id}`}><Button variant="outline" className="px-3 py-2">Open</Button></Link>
            <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeTask(task)}>Delete</Button>
          </div> },
        ]}
        rows={tasks}
        empty="No daily work yet."
      />
    </Card>
  </div>;
}
