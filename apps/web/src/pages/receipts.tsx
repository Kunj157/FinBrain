import { Receipt } from 'lucide-react';

export default function Receipts() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h2 className="mt-4 text-lg font-medium">Receipts</h2>
        <p className="text-sm text-muted-foreground mt-1">Coming in Phase 2</p>
      </div>
    </div>
  );
}
