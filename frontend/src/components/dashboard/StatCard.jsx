import { Home, Wallet, Receipt, Truck } from "lucide-react";
import Card from "../ui/Card";
const icons = { Home, Wallet, Receipt, Truck };
export default function StatCard({ item }) {
  const Icon = icons[item.icon] || Home;
  return <Card className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-brand-muted">{item.label}</p>
        <h3 className="text-3xl font-bold text-brand-text mt-2">{item.value}</h3>
        <p className="text-xs text-brand-success mt-2">{item.change}</p>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-brand-goldSoft text-brand-primary flex items-center justify-center"><Icon size={22}/></div>
    </div>
  </Card>;
}
