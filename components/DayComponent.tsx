import React from 'react';
import EventCard from './EventCard';
import { CalendarDate, DateValue } from '@internationalized/date';
import Column from './Column';

interface Event {
  id: string;
  title: string;
  date: DateValue;
  description: string;
  startTime: { hours: number; minutes: number };
  endTime: { hours: number; minutes: number };
}

interface DayComponentProps {
  date: DateValue;
  events: Event[];
}

const DayComponent: React.FC<DayComponentProps> = ({ date, events }) => {


  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <Column events={events} date={date}/>
    </div>
  );
};

export default DayComponent;
