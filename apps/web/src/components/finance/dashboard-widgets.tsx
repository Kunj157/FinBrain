import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const STORAGE_KEY = 'finbrain-dashboard-layout';

export type WidgetId =
  | 'stat-cards'
  | 'quick-actions'
  | 'income-expense'
  | 'category-breakdown'
  | 'spending-trend'
  | 'recent-transactions'
  | 'weekly-recap'
  | 'data-quality'
  | 'ai-insights'
  | 'ask-finbrain';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  defaultOrder: number;
  colSpan: 1 | 2 | 3;
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'stat-cards', title: 'Stat Cards', defaultOrder: 0, colSpan: 3 },
  { id: 'quick-actions', title: 'Quick Actions', defaultOrder: 1, colSpan: 3 },
  { id: 'income-expense', title: 'Income vs Expenses', defaultOrder: 2, colSpan: 1 },
  { id: 'category-breakdown', title: 'Category Breakdown', defaultOrder: 3, colSpan: 1 },
  { id: 'spending-trend', title: 'Spending Trend', defaultOrder: 4, colSpan: 2 },
  { id: 'recent-transactions', title: 'Recent Transactions', defaultOrder: 5, colSpan: 2 },
  { id: 'weekly-recap', title: 'Weekly Recap', defaultOrder: 6, colSpan: 1 },
  { id: 'data-quality', title: 'Data Quality', defaultOrder: 7, colSpan: 1 },
  { id: 'ai-insights', title: 'AI Insights', defaultOrder: 8, colSpan: 1 },
  { id: 'ask-finbrain', title: 'Ask FinBrain', defaultOrder: 9, colSpan: 1 },
];

function getDefaultLayout(): WidgetId[] {
  return [...AVAILABLE_WIDGETS].sort((a, b) => a.defaultOrder - b.defaultOrder).map((w) => w.id);
}

export function loadDashboardLayout(): WidgetId[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WidgetId[];
      // Validate all IDs exist
      if (parsed.every((id) => AVAILABLE_WIDGETS.some((w) => w.id === id))) {
        return parsed;
      }
    }
  } catch {
    // Corrupt or unavailable storage (private mode, quota) — fall back to defaults.
  }
  return getDefaultLayout();
}

export function saveDashboardLayout(layout: WidgetId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable (private mode, quota) — layout stays session-only.
  }
}

interface SortableWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditing: boolean;
}

export function SortableWidget({ id, children, isEditing }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {children}
    </div>
  );
}

interface DashboardGridProps {
  widgets: WidgetId[];
  onReorder: (widgets: WidgetId[]) => void;
  isEditing: boolean;
  children: React.ReactNode;
}

export function DashboardGrid({ widgets, onReorder, isEditing, children }: DashboardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgets.indexOf(active.id as WidgetId);
    const newIndex = widgets.indexOf(over.id as WidgetId);
    onReorder(arrayMove(widgets, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets} strategy={rectSortingStrategy} disabled={!isEditing}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
