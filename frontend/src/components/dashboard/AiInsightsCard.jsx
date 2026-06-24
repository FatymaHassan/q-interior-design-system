import Card from "../ui/Card";

export default function AiInsightsCard({ insights = [] }) {
  return <Card className="p-5">
    <h3 className="font-bold">AI Insights</h3>
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((insight, index) => <div key={index} className="rounded-xl bg-brand-soft p-4 text-sm text-brand-primary">{insight}</div>)}
    </div>
  </Card>;
}
