import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <SettingsIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h2 className="mt-4 text-lg font-medium">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
      </div>
    </div>
  );
}
