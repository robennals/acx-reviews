'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';
import { useVotesContext } from '@/context/votes-context';

interface Props {
  contestId: string;
  initialBallot: string[];
  reviewLookup: Record<string, { title: string; slug: string }>;
}

export function MyVotesClient({ initialBallot, reviewLookup }: Props) {
  const { ballot, setBallot } = useVotesContext();
  const order = ballot.length > 0 ? ballot : initialBallot;
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    const next = arrayMove(order, oldIdx, newIdx);
    setBusy(true);
    await setBallot(next);
    setBusy(false);
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    await setBallot(order.filter((x) => x !== id));
    setBusy(false);
  };

  if (order.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
        You haven’t ranked anything yet.{' '}
        <Link href="/" className="text-link underline">Browse reviews</Link>
        {' '}and click Vote on one to start.
      </div>
    );
  }

  const counting = order.slice(0, COUNTING_ZONE_SIZE);
  const belowCap = order.slice(COUNTING_ZONE_SIZE);

  return (
    <div className={busy ? 'opacity-70 pointer-events-none' : ''}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="border border-border rounded-lg overflow-hidden">
            {counting.map((id, i) => (
              <SortableRow
                key={id}
                id={id}
                rank={i + 1}
                title={reviewLookup[id]?.title ?? id}
                slug={reviewLookup[id]?.slug}
                onRemove={() => handleRemove(id)}
              />
            ))}
            {belowCap.length > 0 && (
              <div className="px-4 py-2 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground border-y border-border">
                Below this line: won’t count toward voting
              </div>
            )}
            {belowCap.map((id, i) => (
              <SortableRow
                key={id}
                id={id}
                rank={COUNTING_ZONE_SIZE + i + 1}
                title={reviewLookup[id]?.title ?? id}
                slug={reviewLookup[id]?.slug}
                onRemove={() => handleRemove(id)}
                muted
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  rank,
  title,
  slug,
  onRemove,
  muted,
}: {
  id: string;
  rank: number;
  title: string;
  slug?: string;
  onRemove: () => void;
  muted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: muted ? 0.55 : isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 bg-background"
    >
      <button
        type="button"
        className="text-muted-foreground text-lg cursor-grab touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ☰
      </button>
      <span className="bg-muted text-foreground rounded-full w-7 h-7 inline-flex items-center justify-center font-bold text-xs shrink-0">
        {rank}
      </span>
      {slug ? (
        <Link href={`/reviews/${slug}`} className="flex-1 text-sm hover:underline">
          {title}
        </Link>
      ) : (
        <span className="flex-1 text-sm">{title}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground text-xl leading-none px-2 py-1 hover:text-red-600"
        aria-label={`Remove ${title}`}
      >
        ×
      </button>
    </div>
  );
}
