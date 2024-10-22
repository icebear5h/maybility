import { Card, CardHeader } from "@nextui-org/react";
import { DateValue } from '@internationalized/date';


interface Event {
  id: string;
  title: string;
  date: DateValue;
  description: string;
  startTime: { hours: number; minutes: number };
  endTime: { hours: number; minutes: number };
}

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const startMinutes = event.startTime.hours * 60 + event.startTime.minutes;
  const endMinutes = event.endTime.hours * 60 + event.endTime.minutes;
  const duration = endMinutes - startMinutes;

  return (
    <Card 
      style={{
        position: "absolute",
        top: `${(startMinutes / (24 * 60)) * 100}%`, // Adjusts based on the 24-hour grid
        height: `${(duration / (24 * 60)) * 100}%`, // Scales according to the duration
        width: "100%",
      }}
    >
      <CardHeader>{event.title}</CardHeader>
    </Card>
  );
};

export default EventCard;
