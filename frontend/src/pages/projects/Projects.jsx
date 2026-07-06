import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, FolderKanban, Users } from "lucide-react";
import Button from "../../components/ui/Button";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import ProjectList from "./ProjectList";
import { getClients } from "../../services/api";
import { deleteProject, getProjects } from "./projectApi";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    loadProjects(active);
    return () => {
      active = false;
    };
  }, []);

  const loadProjects = (active = true) => {
    Promise.all([getProjects(), getClients()]).then(([projectData, clientData]) => {
      if (!active) return;
      setProjects(projectData);
      setClients(clientData);
      setStatus("connected");
    }).catch(() => {
      if (!active) return;
      setProjects([]);
      setClients([]);
      setStatus("fallback");
    });
  };

  const removeProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    loadProjects();
  };

  const summary = useMemo(() => {
    const budget = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
    const expenses = projects.reduce((sum, project) => sum + Number(project.expenses || 0), 0);
    return { budget, expenses };
  }, [projects]);

  return <div className="space-y-4">
    <PageHeader eyebrow="Project Work" title="Projects" description="Track budgets, clients, progress, and project delivery in a compact portfolio view." action={<Link to="/projects/add"><Button>Add Project</Button></Link>} />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard label="Total Budget" value={`$${summary.budget.toLocaleString()}`} icon={DollarSign} />
      <MetricCard label="Recorded Costs" value={`$${summary.expenses.toLocaleString()}`} icon={FolderKanban} />
      <MetricCard label="Clients" value={clients.length || "..."} icon={Users} />
    </section>
    <ProjectList projects={projects} status={status} onDelete={removeProject} />
  </div>;
}

