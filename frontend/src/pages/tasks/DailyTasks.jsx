import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createTask, deleteTask, getEmployees, getProjects, getTaskDailySummary, getTasks, updateTaskStatus } from "../../services/api";

const emptyTask = { project_id: "", employee_id: "", title: "", description: "", priority: "Medium", status: "Pending", deadline: "", notes: "" };

export default function DailyTasks() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyTask);

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
    overdue: summary?.overdue?.length || 0,
  }), [summary]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitTask = async (event) => {
    event.preventDefault();
    await createTask({ ...form, project_id: Number(form.project_id), employee_id: form.employee_id ? Number(form.employee_id) : null, assigned_to: null });
    setForm(emptyTask);
    load();
  };

  const changeStatus = async (task, status) => {
    await updateTaskStatus(task.id, status);
    load();
  };

  const removeTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await deleteTask(task.id);
    load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-bold text-brand-primary">Daily Tasks</h1>
      <p className="text-sm text-brand-muted">Assign work, track deadlines, and see what is completed today.</p>
    </div>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-brand-muted">Completed Today</p><b className="text-2xl">{counts.completed}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Pending / In Progress</p><b className="text-2xl">{counts.pending}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Overdue</p><b className="text-2xl text-brand-danger">{counts.overdue}</b></Card>
    </section>

    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Assign Daily Task</h2>
      <form onSubmit={submitTask} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Assigned employee"><select name="employee_id" value={form.employee_id} onChange={updateField} className={fieldInputClass}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.position}</option>)}</select></FormField>
        <FormField label="Task title"><input name="title" value={form.title} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Deadline"><input name="deadline" type="date" value={form.deadline} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Priority"><select name="priority" value={form.priority} onChange={updateField} className={fieldInputClass}><option>Low</option><option>Medium</option><option>High</option></select></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Pending</option><option>In Progress</option><option>Done</option><option>Overdue</option></select></FormField>
        <FormField label="Description" className="lg:col-span-2"><textarea name="description" value={form.description} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><Button>Save Task</Button></div>
      </form>
    </Card>

    <Card className="p-5">
      <h2 className="mb-4 text-xl font-bold">Task List</h2>
      <Table
        columns={[
          { key: "title", label: "Task", render: (task) => <Link to={`/tasks/${task.id}`} className="font-bold text-brand-primary hover:underline">{task.title}</Link> },
          { key: "project", label: "Project" },
          { key: "assignee", label: "Assigned To" },
          { key: "priority", label: "Priority", render: (task) => <Badge>{task.priority}</Badge> },
          { key: "status", label: "Status", render: (task) => <Badge>{task.status}</Badge> },
          { key: "deadline", label: "Deadline" },
          { key: "actions", label: "Actions", render: (task) => <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="px-3 py-2" onClick={() => changeStatus(task, "In Progress")}>Start</Button>
            <Button variant="outline" className="px-3 py-2" onClick={() => changeStatus(task, "Done")}>Done</Button>
            <Link to={`/tasks/${task.id}`}><Button variant="outline" className="px-3 py-2">Open</Button></Link>
            <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeTask(task)}>Delete</Button>
          </div> },
        ]}
        rows={tasks}
        empty="No daily tasks yet."
      />
    </Card>
  </div>;
}
