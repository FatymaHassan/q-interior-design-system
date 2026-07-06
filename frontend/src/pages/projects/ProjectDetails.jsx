import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ProgressBar from "../../components/ui/ProgressBar";
import { getProjectFinanceSummary } from "../../services/api";
import { formatCurrency, formatPercentage } from "../../utils/numberFormat";
import { getProject } from "./projectApi";

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [finance, setFinance] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([
      getProject(id),
      getProjectFinanceSummary(id).catch(() => null),
    ]).then(([projectData, financeData]) => {
      setProject(projectData);
      setFinance(financeData);
      setStatus("connected");
    }).catch(() => setStatus("error"));
  }, [id]);

  const raw = project?.raw || {};
  const metrics = finance?.metrics || {};
  const generalRows = useMemo(() => [
    ["Project Name", project?.name],
    ["Client", project?.client],
    ["Location", project?.location],
    ["Stage", project?.stage],
    ["Status", project?.status],
    ["Start Date", dateValue(raw.start_date)],
    ["Due Date", dateValue(raw.end_date)],
    ["Deadline", project?.deadline],
  ], [project, raw.start_date, raw.end_date]);

  const contractRows = useMemo(() => [
    ["Budget", formatCurrency(project?.budget)],
    ["Contract Amount", formatCurrency(metrics.contract_amount ?? project?.contractAmount)],
    ["Progress", formatPercentage(project?.progress)],
  ], [project, metrics]);

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading project...</Card>;
  if (status === "error" || !project) return <Card className="p-5 text-sm text-brand-danger">Project could not be loaded.</Card>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/projects"><Button variant="outline">Back to Projects</Button></Link>
      <Link to={`/projects/${project.id}/edit`}><Button>Edit Project</Button></Link>
    </div>

    <section className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-card">
      <div className="bg-brand-primaryDark px-5 py-6 text-white md:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">Project Overview</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{project.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">{raw.description || raw.notes || "No project notes added yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{project.stage}</Badge>
            <Badge>{project.status}</Badge>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold text-brand-muted">Project progress</span>
          <b className="text-brand-primary">{project.progress}%</b>
        </div>
        <ProgressBar value={project.progress} />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <InfoPanel title="General Information" rows={generalRows} />
      <InfoPanel title="Contract Snapshot" rows={contractRows} />
    </section>

    <Card className="p-5">
      <h2 className="text-lg font-black text-brand-primary">Project Notes</h2>
      <p className="mt-3 text-sm leading-6 text-brand-muted">{raw.notes || raw.description || "No notes added."}</p>
    </Card>
  </div>;
}

function InfoPanel({ title, rows }) {
  return <Card className="p-5">
    <h2 className="text-lg font-black text-brand-primary">{title}</h2>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
    </div>
  </Card>;
}

function InfoTile({ label, value }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft/65 p-3">
    <p className="text-[11px] font-black uppercase tracking-wide text-brand-muted">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-brand-primary">{value || "-"}</p>
  </div>;
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : "-";
}
