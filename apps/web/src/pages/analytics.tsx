import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h2 className="mt-4 text-lg font-medium">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Coming in Phase 5</p>
      </div>
    </div>
  );
}
