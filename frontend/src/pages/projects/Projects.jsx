import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import ProjectList from "./ProjectList";
import { deleteProject, getProjects } from "./projectApi";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    loadProjects(active);
    return () => {
      active = false;
    };
  }, []);

  const loadProjects = (active = true) => {
    getProjects().then((projectData) => {
      if (!active) return;
      setProjects(projectData);
      setStatus("connected");
    }).catch(() => {
      if (!active) return;
      setProjects([]);
      setStatus("fallback");
    });
  };

  const removeProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    loadProjects();
  };

  return <div className="space-y-4">
    <PageHeader eyebrow="Project Work" title="Projects" description="All project records in one clean list." action={<Link to="/projects/add"><Button>Add Project</Button></Link>} />
    <ProjectList projects={projects} status={status} onDelete={removeProject} />
  </div>;
}
