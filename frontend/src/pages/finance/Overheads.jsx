import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import OverheadList from "./OverheadList";
import { FinanceHeader } from "./financeUi";
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
    <FinanceHeader
      title="Overheads"
      description="Track company operating costs with the same payroll-style finance table and form design."
      action={<Link to="/overheads/add"><Button className="gap-2"><Plus size={16} />Add Overhead</Button></Link>}
    />
    <OverheadList overheads={overheads} onDelete={removeOverhead} />
  </div>;
}
