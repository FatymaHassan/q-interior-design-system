import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../ui/Card";
import { revenueData } from "../../data/mockData";
export default function RevenueChart({ data = revenueData }) {
  return <Card className="p-5 h-80">
    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-brand-text">Revenue vs Expenses</h3><span className="text-xs text-brand-muted">Monthly</span></div>
    <ResponsiveContainer width="100%" height="85%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5D8C8" />
        <XAxis dataKey="month" stroke="#7A6E66" />
        <YAxis stroke="#7A6E66" />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" stroke="#4A3427" strokeWidth={3} />
        <Line type="monotone" dataKey="expenses" stroke="#C8A46A" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </Card>;
}
