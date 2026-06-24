import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { createEmployeeGoal, createPerformanceReview } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function ReviewsGoals() {
  const { employees, reviews, goals, notice, reload } = useHrData(["employees", "reviews", "goals"]);
  const [reviewForm, setReviewForm] = useState({ employee_id: "", review_period: "", review_date: "", goals_score: 3, quality_score: 3, teamwork_score: 3, punctuality_score: 3, communication_score: 3, manager_comments: "", status: "Reviewed" });
  const [goalForm, setGoalForm] = useState({ employee_id: "", title: "", description: "", target_date: "", status: "Not Started", progress: 0, manager_comment: "" });

  useEffect(() => {
    const firstEmployee = employees[0]?.id || "";
    setReviewForm((current) => ({ ...current, employee_id: current.employee_id || firstEmployee }));
    setGoalForm((current) => ({ ...current, employee_id: current.employee_id || firstEmployee }));
  }, [employees]);

  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);

  return <div className="space-y-6">
    <HRPageHeader title="Reviews & Goals" description="Track performance reviews, manager comments, goal progress, and staff development." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Performance Reviews">
      <form onSubmit={async (e) => { e.preventDefault(); await createPerformanceReview(reviewForm); reload(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-6">
        <select value={reviewForm.employee_id} onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })} className={fieldInputClass}>{employeeOptions}</select>
        <input placeholder="Period" value={reviewForm.review_period} onChange={(e) => setReviewForm({ ...reviewForm, review_period: e.target.value })} className={fieldInputClass} />
        <input type="date" value={reviewForm.review_date} onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })} className={fieldInputClass} />
        {["goals_score", "quality_score", "teamwork_score"].map((field) => <input key={field} type="number" min="1" max="5" value={reviewForm[field]} onChange={(e) => setReviewForm({ ...reviewForm, [field]: e.target.value })} className={fieldInputClass} />)}
        <Button>Create Review</Button>
      </form>
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "review_period", label: "Period" },
        { key: "review_date", label: "Date" },
        { key: "overall_rating", label: "Overall" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "manager_comments", label: "Comments" },
      ]} rows={reviews} empty="No performance reviews yet." />
    </SectionCard>
    <SectionCard title="Employee Goals">
      <form onSubmit={async (e) => { e.preventDefault(); await createEmployeeGoal(goalForm); setGoalForm({ ...goalForm, title: "", description: "", progress: 0 }); reload(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-6">
        <select value={goalForm.employee_id} onChange={(e) => setGoalForm({ ...goalForm, employee_id: e.target.value })} className={fieldInputClass}>{employeeOptions}</select>
        <input required placeholder="Goal title" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} className={fieldInputClass} />
        <input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} className={fieldInputClass} />
        <select value={goalForm.status} onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })} className={fieldInputClass}><option>Not Started</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select>
        <input type="number" min="0" max="100" value={goalForm.progress} onChange={(e) => setGoalForm({ ...goalForm, progress: e.target.value })} className={fieldInputClass} />
        <Button>Add Goal</Button>
      </form>
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "title", label: "Goal" },
        { key: "target_date", label: "Target" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "progress", label: "Progress", render: (row) => `${row.progress}%` },
        { key: "manager_comment", label: "Comment" },
      ]} rows={goals} empty="No employee goals yet." />
    </SectionCard>
  </div>;
}
