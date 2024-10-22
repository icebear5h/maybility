import React from 'react';
import DayComponent from '../components/DayComponent';
import WeekComponent from '../components/WeekComponent';
import { CalendarDate, DateValue } from '@internationalized/date';
import { HourTape } from './HourTape';

interface Event {
  id: string;
  title: string;
  date: DateValue;
  description: string;
  startTime: { hours: number; minutes: number };
  endTime: { hours: number; minutes: number };
}

interface MaybilityCalendarProps {
  view: 'day' | 'week' | 'month'; // Extend this for additional views
  events: Event[];
  selectedDate: DateValue;
}

const MaybilityCalendar: React.FC<MaybilityCalendarProps> = ({ view, events, selectedDate }) => {
  switch (view) {
    case 'day':
      return (
        <>
          <HourTape />
          <DayComponent date={selectedDate} events={events} />
        </>
      );
    case 'week':
      return (
        <div>
          <HourTape />
          <WeekComponent date={selectedDate} events={events} />
        </div>
      );
    // Uncomment this if you have a MonthComponent
    // case 'month':
    //   return <MonthComponent date={selectedDate} events={events} />;
    default:
      return null;
  }
};

export default MaybilityCalendar;
