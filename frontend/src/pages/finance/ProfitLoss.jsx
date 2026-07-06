import { useEffect, useState } from "react";
import { BarChart3, Receipt, Wallet } from "lucide-react";
import Card from "../../components/ui/Card";
import MetricCard from "../../components/ui/MetricCard";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import SectionCard from "../../components/ui/SectionCard";
import Table from "../../components/ui/Table";
import { getFinancePnl, getOverheadReport, getPayrollReport, getProjectProfitReport, getProjects } from "../../services/api";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;

export default function ProfitLoss() {
  const [pnl, setPnl] = useState(null);
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectRows, setProjectRows] = useState([]);
  const [overheads, setOverheads] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    getProjects().then(setProjectOptions).catch(() => setProjectOptions([]));
  }, []);

  useEffect(() => {
    const params = selectedProject ? { project_id: selectedProject } : {};
    const companyReports = selectedProject ? [Promise.resolve(null), Promise.resolve(null)] : [getOverheadReport(), getPayrollReport()];
    setStatus("loading");
    Promise.all([getFinancePnl(params), getProjectProfitReport(params), ...companyReports])
      .then(([pnlData, projectData, overheadData, payrollData]) => {
        setPnl(pnlData);
        setProjectRows(projectData);
        setOverheads(overheadData);
        setPayroll(payrollData);
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, [selectedProject]);

  return <div className="space-y-4">
    {status === "error" && <Card className="p-4 text-sm text-brand-danger">P&L report could not be loaded.</Card>}

    <Card className="p-4">
      <FormField label="Project filter">
        <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className={fieldInputClass}>
          <option value="">All projects P&L summary</option>
          {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </FormField>
    </Card>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue" value={money(pnl?.revenue)} icon={Wallet} />
      <MetricCard label="Project Costs" value={money(pnl?.project_costs)} icon={Receipt} />
      <MetricCard label="Gross Profit" value={money(pnl?.gross_profit)} icon={BarChart3} />
      <MetricCard label="Net Profit" value={money(pnl?.net_profit)} icon={Wallet} />
      {!selectedProject && <MetricCard label="Company Overhead" value={money(pnl?.company_overhead)} icon={Receipt} />}
      {!selectedProject && <MetricCard label="Payroll" value={money(pnl?.payroll)} icon={Receipt} />}
      <MetricCard label="Profit Margin" value={`${Number(pnl?.profit_margin || 0)}%`} icon={BarChart3} />
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="P&L Lines">
        <Table
          columns={[
            { key: "label", label: "Line", render: (row) => <b>{row.label}</b> },
            { key: "type", label: "Type" },
            { key: "amount", label: "Amount", render: (row) => money(row.amount) },
          ]}
          rows={pnl?.lines || []}
          empty="No P&L lines yet."
        />
      </SectionCard>
      <SectionCard title="Project Profit Report">
        <Table
          columns={[
            { key: "project", label: "Project", render: (row) => <b>{row.project}</b> },
            { key: "client", label: "Client" },
            { key: "client_payment", label: "Client Payment", render: (row) => money(row.client_payment) },
            { key: "project_cost", label: "Cost", render: (row) => money(row.project_cost) },
            { key: "profit", label: "Profit", render: (row) => money(row.profit) },
            { key: "margin", label: "Margin", render: (row) => `${Number(row.margin || 0)}%` },
          ]}
          rows={projectRows}
          empty="No project finance data yet."
        />
      </SectionCard>
    </section>

    {!selectedProject && <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Overhead Report" subtitle={`Total ${money(overheads?.total)}`}>
        <Table
          columns={[
            { key: "date", label: "Date" },
            { key: "category", label: "Category" },
            { key: "title", label: "Item", render: (row) => <b>{row.title}</b> },
            { key: "amount", label: "Amount", render: (row) => money(row.amount) },
            { key: "source", label: "Source" },
          ]}
          rows={overheads?.rows || []}
          empty="No overhead records yet."
        />
      </SectionCard>
      <SectionCard title="Payroll Report" subtitle={`Total ${money(payroll?.total)}`}>
        <Table
          columns={[
            { key: "date", label: "Date" },
            { key: "employee", label: "Employee", render: (row) => row.employee || "-" },
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount", render: (row) => money(row.amount) },
            { key: "source", label: "Source" },
          ]}
          rows={payroll?.rows || []}
          empty="No payroll records yet."
        />
      </SectionCard>
    </section>}
  </div>;
}
