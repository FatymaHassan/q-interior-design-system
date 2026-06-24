import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import ProgressBar from "../../components/ui/ProgressBar";
import Table from "../../components/ui/Table";
import { getClients, getProjectBoard, getTeamMembers, updateProjectStage } from "../../services/api";

export default function ProjectBoard() {
  const [stages, setStages] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", client_id: "", staff_id: "" });
  const [view, setView] = useState("board");
  const [status, setStatus] = useState("loading");

  const loadBoard = () => Promise.all([getProjectBoard(filters), getClients(), getTeamMembers({ status: "Active" })]).then(([data, clientData, memberData]) => {
    setStages(data);
    setClients(clientData);
    setTeamMembers(memberData);
    setStatus("connected");
  }).catch(() => setStatus("error"));

  useEffect(() => {
    loadBoard();
  }, [filters.search, filters.status, filters.client_id, filters.staff_id]);

  const moveProject = async (project, direction) => {
    const flatStages = stages;
    const currentIndex = flatStages.findIndex((stage) => stage.id === project.project_stage_id);
    const nextStage = flatStages[currentIndex + direction];
    if (!nextStage) return;
    await updateProjectStage(project.id, nextStage.id);
    loadBoard();
  };

  const moveProjectToStage = async (project, stageId) => {
    await updateProjectStage(project.id, stageId);
    loadBoard();
  };

  const allProjects = stages.flatMap((stage) => (stage.projects || []).map((project) => ({ ...project, stageName: stage.name })));
  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const onDropProject = async (event, stage) => {
    event.preventDefault();
    const projectId = event.dataTransfer.getData("project/id");
    const project = allProjects.find((item) => String(item.id) === projectId);
    if (project && project.project_stage_id !== stage.id) await moveProjectToStage(project, stage.id);
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-gold">Project & Daily Work</p>
        <h1 className="mt-2 text-3xl font-black text-brand-primary">Project Board</h1>
        <p className="text-sm text-brand-muted">Move projects through Inquiry, Design, Materials Order, Installation, and Completed.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant={view === "board" ? "primary" : "outline"} onClick={() => setView("board")}>Board</Button><Button variant={view === "list" ? "primary" : "outline"} onClick={() => setView("list")}>List</Button><Link to="/projects/add"><Button>Add Project</Button></Link></div>
    </div>

    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <FormField label="Search"><input name="search" value={filters.search} onChange={updateFilter} placeholder="Project or client" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={filters.status} onChange={updateFilter} className={fieldInputClass}><option value="">All</option><option>Pending</option><option>Active</option><option>In Progress</option><option>Completed</option><option>Delayed</option><option>Cancelled</option></select></FormField>
        <FormField label="Client"><select name="client_id" value={filters.client_id} onChange={updateFilter} className={fieldInputClass}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
        <FormField label="Assigned team"><select name="staff_id" value={filters.staff_id} onChange={updateFilter} className={fieldInputClass}><option value="">All team</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></FormField>
      </div>
    </Card>

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Project board could not be loaded.</Card>}

    {view === "list" && <Card className="p-5">
      <Table
        columns={[
          { key: "project_name", label: "Project", render: (project) => <Link to={`/projects/${project.id}`} className="font-bold text-brand-primary hover:underline">{project.name || project.project_name}</Link> },
          { key: "client", label: "Client", render: (project) => project.client?.name || "-" },
          { key: "stageName", label: "Stage" },
          { key: "status", label: "Status", render: (project) => <Badge>{project.status}</Badge> },
          { key: "deadline", label: "Deadline", render: (project) => project.deadline || project.end_date || "-" },
          { key: "progress", label: "Progress", render: (project) => `${project.progress || 0}%` },
        ]}
        rows={allProjects}
        empty="No projects match these filters."
      />
    </Card>}

    {view === "board" && <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      {stages.map((stage) => <Card key={stage.id} className="min-h-[18rem] p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropProject(event, stage)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{stage.name}</h2>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-primary">{stage.projects?.length || 0}</span>
        </div>
        <div className="space-y-3">
          {(stage.projects || []).map((project) => <div key={project.id} draggable onDragStart={(event) => event.dataTransfer.setData("project/id", String(project.id))} className="cursor-grab rounded-2xl border border-brand-border bg-white p-4 shadow-sm active:cursor-grabbing">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link to={`/projects/${project.id}`} className="font-bold text-brand-primary hover:underline">{project.name || project.project_name}</Link>
                <p className="text-xs text-brand-muted">{project.client?.name || "No client"}</p>
              </div>
              <Badge>{project.status}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-xs text-brand-muted">
              <div className="flex justify-between"><span>Deadline</span><b>{project.deadline || project.end_date || "-"}</b></div>
              <div className="flex justify-between"><span>Budget used</span><b>{Number(project.budget || 0) > 0 ? Math.round((Number(project.actual_cost || 0) / Number(project.budget || 1)) * 100) : 0}%</b></div>
              <div>
                <div className="mb-1 flex justify-between"><span>Progress</span><b>{project.progress || 0}%</b></div>
                <ProgressBar value={project.progress || 0} />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(project.members || []).slice(0, 3).map((member) => <span key={member.id} className="rounded-full bg-brand-soft px-2 py-1">{member.employee?.name || member.user?.name || "Member"}</span>)}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1 px-3 py-2 text-xs" onClick={() => moveProject(project, -1)}>Back</Button>
              <Button variant="outline" className="flex-1 px-3 py-2 text-xs" onClick={() => moveProject(project, 1)}>Next</Button>
            </div>
          </div>)}
          {(stage.projects || []).length === 0 && <p className="rounded-2xl border border-dashed border-brand-border p-4 text-center text-sm text-brand-muted">No projects here.</p>}
        </div>
      </Card>)}
    </section>}
  </div>;
}
