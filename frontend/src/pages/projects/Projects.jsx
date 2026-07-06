import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
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
    <div className="flex justify-end"><Link to="/projects/add"><Button>Add Project</Button></Link></div>
    <ProjectList projects={projects} status={status} onDelete={removeProject} />
  </div>;
}
