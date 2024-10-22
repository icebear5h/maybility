import React from 'react';



export function HourTape(): JSX.Element {
  return (
    <div className="flex flex-col text-gray-500">
      {Array.from({ length: 24 }, (_, index) => (
        <div
          key={index}
          className="flex-1 border-b border-gray-300 dark:border-neutral-700 flex items-end h-16"
        >
          <span className="pl-2">{`${index}:00`}</span>
        </div>
      ))}
    </div>
  );
}
