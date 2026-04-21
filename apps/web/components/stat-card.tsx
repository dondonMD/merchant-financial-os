export function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="metric-card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accent ?? "text-ink"}`}>{value}</p>
    </div>
  );
}

