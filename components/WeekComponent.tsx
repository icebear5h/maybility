import React from 'react';
import DayComponent from './DayComponent'; // Assuming you have this component
import { CalendarDate, DateValue, startOfWeek } from '@internationalized/date';

interface Event {
    id: string;
    title: string;
    date: DateValue;
    description: string;
    startTime: { hours: number; minutes: number };
    endTime: { hours: number; minutes: number };
  }

interface WeekComponentProps {
  date: DateValue; // The date from which to start the week
  events: Event[];
}

const WeekComponent: React.FC<WeekComponentProps> = ({ date, events }) => {
  // Find the nearest Sunday to the given date
  const weekStart = startOfWeek(date, 'en-US');

  // Generate an array of the dates for the week (Sunday to Saturday)
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const currentDay = weekStart;
    currentDay.add({days: 1});
    return currentDay;
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {weekDates.map((weekDate) => (
        <div key={weekDate.toString()} style={{ flex: 1 }}>
          <DayComponent date={weekDate} events={events} />
        </div>
      ))}
    </div>
  );
};

export default WeekComponent;
