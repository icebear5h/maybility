import React from 'react';
import Link from 'next/link';
import { CalendarDate, DateValue } from '@internationalized/date';
import EventItem from './EventItem';
import { useDroppable, useDraggable, DndContext } from '@dnd-kit/core';

interface Event {
  id: string;
  title: string;
  date: DateValue;
  description: string;
  startTime: { hours: number; minutes: number };
  endTime: { hours: number; minutes: number };
}

interface ColumnProps {
  events: Event[];
  date: DateValue;
}

const SNAP_INTERVAL = 15; // Snap to every 15 minutes

const usePlacing = (events: Event[], date: DateValue) => {
  return React.useMemo(() => {
    const atomCount = (24 * 60) / SNAP_INTERVAL;
    const atoms: string[][] = Array.from({ length: atomCount }, () => []);
    const startDate = new Date(date.year, date.month - 1, date.day, 0, 0, 0);
    const startTime = startDate.getTime();

    events.forEach(({ id, startTime: start, endTime: end }) => {
      const startDateTime = new Date(date.year, date.month - 1, date.day, start.hours, start.minutes);
      const endDateTime = new Date(date.year, date.month - 1, date.day, end.hours, end.minutes);

      const startAtom = Math.floor(
        ((startDateTime.getTime() - startTime) / (24 * 60 * 60 * 1000)) * atomCount
      );
      const endAtom = Math.ceil(
        ((endDateTime.getTime() - startTime) / (24 * 60 * 60 * 1000)) * atomCount
      );

      for (let i = startAtom; i < endAtom; i++) {
        atoms[i].push(id);
      }
    });

    return events.map(({ id }) => {
      const startIndex = atoms.findIndex(atom => atom.includes(id));
      const endIndex = atoms.length - atoms.slice().reverse().findIndex(atom => atom.includes(id)) - 1;

      const fraction = Math.max(...atoms.slice(startIndex, endIndex).map(atom => atom.length));
      const left = atoms[startIndex].indexOf(id);

      return {
        top: (startIndex / atomCount) * 100,
        left: (left / fraction) * 100,
        width: (1 / fraction) * 100,
        height: ((endIndex - startIndex) / atomCount) * 100,
      };
    });
  }, [events, date]);
};

const Column: React.FC<ColumnProps> = ({ events, date }) => {
  const [currentTime, setCurrentTime] = React.useState<number | undefined>(undefined);
  const placing = usePlacing(events, date);

  const { setNodeRef } = useDroppable({ id: `column-${date.day}` });

  React.useEffect(() => {
    const updateTime = () => {
      const currentDate = new Date();
      if (
        currentDate.getFullYear() === date.year &&
        currentDate.getMonth() + 1 === date.month &&
        currentDate.getDate() === date.day
      ) {
        const dayStart = new Date(date.year, date.month - 1, date.day, 0, 0, 0);
        setCurrentTime((currentDate.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000));
      } else {
        setCurrentTime(undefined);
      }
    };

    const interval = setInterval(updateTime, 60000); // Update every minute
    updateTime();

    return () => clearInterval(interval);
  }, [date]);

  const handleDragEnd = (event: Event) => {
    const { active, over } = event;

    if (over) {
      const eventToUpdate = events.find(e => e.id === active.id);
      if (eventToUpdate) {
        const dropPositionY = parseFloat(over.rect.top);
        const totalMinutesInDay = 24 * 60;
        const droppedMinutes = (dropPositionY / over.rect.height) * totalMinutesInDay;

        const snappedMinutes = Math.round(droppedMinutes / SNAP_INTERVAL) * SNAP_INTERVAL;
        const snappedHours = Math.floor(snappedMinutes / 60);
        const snappedRemainderMinutes = snappedMinutes % 60;

        eventToUpdate.startTime = { hours: snappedHours, minutes: snappedRemainderMinutes };
        eventToUpdate.endTime = { hours: snappedHours, minutes: snappedRemainderMinutes + SNAP_INTERVAL };
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div ref={setNodeRef} className="flex-1 flex flex-col relative">
        {typeof currentTime === 'number' && (
          <div
            aria-hidden="true"
            className="absolute w-full bg-red-500 h-0.5 z-10 pointer-events-none"
            style={{ top: `${currentTime * 100}%` }}
          >
            <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}
        <Link
          href={`/view/date/${date.year}-${date.month}-${date.day}/event/add`}
          className="absolute w-full h-full flex flex-col"
          aria-label="Create Event"
        >
          {Array.from({ length: 24 }, (_, index) => (
            <span
              key={index}
              className="border-b border-gray-200 dark:border-neutral-700 flex-1"
            />
          ))}
        </Link>
        {events.map((event, index) => (
          <EventItem
            key={event.id}
            event={event}
            style={{
              top: `${placing[index].top}%`,
              left: `${placing[index].left}%`,
              width: `${placing[index].width}%`,
              height: `${placing[index].height}%`,
              position: 'absolute',
              zIndex: 10,
            }}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default Column;
