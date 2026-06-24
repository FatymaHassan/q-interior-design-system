import { CalendarDays, MapPin } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";

function ProjectCard({ project, onDelete }) {
  const budget = Number(project.budget || 0);
  const expenses = Number(project.expenses || 0);
  const remaining = budget - expenses;

  return <Card className="overflow-hidden">
    <div className="h-28 bg-brand-primaryDark p-4 text-white">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/55">Interior project</p>
            <h3 className="mt-1 line-clamp-2 font-bold leading-snug">{project.name}</h3>
          </div>
          <Badge>{project.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/65"><MapPin size={14} />{project.location}</div>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{project.client}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-muted"><CalendarDays size={14} />Due {project.due}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-brand-muted">Progress</p>
          <b>{project.progress}%</b>
        </div>
      </div>
      <div className="mt-3"><ProgressBar value={project.progress} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/projects/${project.id}`}><Button variant="outline" className="min-h-9 px-3 py-1.5 text-xs">View</Button></Link>
        <Link to={`/projects/${project.id}/edit`}><Button variant="outline" className="min-h-9 px-3 py-1.5 text-xs">Edit</Button></Link>
        <Button variant="outline" className="min-h-9 px-3 py-1.5 text-xs text-brand-danger" onClick={() => onDelete?.(project)}>Delete</Button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-brand-soft p-2.5"><p className="text-xs text-brand-muted">Budget</p><b>${budget.toLocaleString()}</b></div>
        <div className="rounded-xl bg-brand-soft p-2.5"><p className="text-xs text-brand-muted">Spent</p><b>${expenses.toLocaleString()}</b></div>
        <div className={`rounded-xl p-2.5 ${remaining >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}><p className="text-xs opacity-75">Left</p><b>${remaining.toLocaleString()}</b></div>
      </div>
    </div>
  </Card>;
}

export default function ProjectList({ projects, status, onDelete }) {
  return <div className="space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-bold">Project Portfolio</h2>
        {status === "fallback" && <p className="mt-1 text-sm text-brand-muted">Showing sample data because the backend is not reachable.</p>}
        {status === "connected" && <p className="mt-1 text-sm text-green-700">Loaded from Laravel API.</p>}
      </div>
      <p className="text-sm text-brand-muted">{projects.length} total projects</p>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => <ProjectCard key={project.id} project={project} onDelete={onDelete} />)}
    </div>
  </div>;
}
