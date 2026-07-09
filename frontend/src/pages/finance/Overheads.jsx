import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import OverheadList from "./OverheadList";
import { deleteOverhead, getOverheads } from "./overheadApi";

export default function Overheads() {
  const [overheads, setOverheads] = useState([]);
  const confirm = useConfirmDialog();

  useEffect(() => {
    loadOverheads();
  }, []);
  const loadOverheads = () => getOverheads().then(setOverheads).catch(() => setOverheads([]));
  const removeOverhead = async (overhead) => {
    const ok = await confirm({
      title: "Delete overhead?",
      message: `Delete "${overhead.title}" from overhead expenses? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteOverhead(overhead.id);
    loadOverheads();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/overheads/add"><Button className="gap-2"><Plus size={16} />Add Overhead</Button></Link></div>
    <OverheadList overheads={overheads} onDelete={removeOverhead} />
  </div>;
}
