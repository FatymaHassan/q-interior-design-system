import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";

export default function ProjectProgressCard({ projects = [] }) {
  return <Card className="p-5 xl:col-span-2">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="font-bold">Active Project Progress</h3>
        <p className="text-sm text-brand-muted">Recent project health and budget visibility.</p>
      </div>
      <Link to="/projects" className="flex items-center gap-1 text-sm font-semibold text-brand-primary">View all <ArrowUpRight size={16} /></Link>
    </div>
    <div className="space-y-4">{projects.slice(0, 5).map((project) => <div key={project.id} className="rounded-2xl border border-brand-border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{project.name}</p>
          <p className="text-xs text-brand-muted">{project.client} - Due {project.due}</p>
        </div>
        <Badge>{project.status}</Badge>
      </div>
      <ProgressBar value={project.progress} />
      <div className="mt-2 flex justify-between text-xs text-brand-muted">
        <span>{project.progress}% complete</span>
        <span>Budget ${Number(project.budget || 0).toLocaleString()}</span>
      </div>
    </div>)}</div>
  </Card>;
}
