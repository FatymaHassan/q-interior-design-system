import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import OverheadList from "./OverheadList";
import { deleteOverhead, getOverheads } from "./overheadApi";

export default function Overheads() {
  const [overheads, setOverheads] = useState([]);

  useEffect(() => {
    loadOverheads();
  }, []);
  const loadOverheads = () => getOverheads().then(setOverheads).catch(() => setOverheads([]));
  const removeOverhead = async (overhead) => {
    if (!window.confirm(`Delete overhead "${overhead.title}"?`)) return;
    await deleteOverhead(overhead.id);
    loadOverheads();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/overheads/add"><Button>Add Overhead</Button></Link></div>
    <OverheadList overheads={overheads} onDelete={removeOverhead} />
  </div>;
}
