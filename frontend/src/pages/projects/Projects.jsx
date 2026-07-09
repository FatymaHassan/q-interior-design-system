import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import ProjectList from "./ProjectList";
import { deleteProject, getProjects } from "./projectApi";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const confirm = useConfirmDialog();

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
    const ok = await confirm({
      title: "Delete project?",
      message: `Delete "${project.name}" and remove it from projects? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteProject(project.id);
    loadProjects();
  };

  return <div className="space-y-4">
    <div className="flex justify-end"><Link to="/projects/add"><Button>Add Project</Button></Link></div>
    <ProjectList projects={projects} status={status} onDelete={removeProject} />
  </div>;
}
