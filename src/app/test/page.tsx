"use client"

import React from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

function Draggable() {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'draggable',
  });

  const style = {
    transform: `translate3d(${transform?.x}px, ${transform?.y}px, 0)`,
    width: '100px',
    height: '100px',
    backgroundColor: 'lightgreen',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      Drag me
    </div>
  );
}

function Droppable() {
  const { setNodeRef } = useDroppable({
    id: 'droppable',
  });

  return (
    <div ref={setNodeRef} style={{ width: '200px', height: '200px', backgroundColor: 'lightblue' }}>
      Drop here
    </div>
  );
}

export default function SimpleDnDTest() {
  return (
    <DndContext>
      <div style={{ display: 'flex', gap: '20px' }}>
        <Draggable />
        <Droppable />
      </div>
    </DndContext>
  );
}
