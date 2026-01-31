"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableSlotProps {
  slotKey: string;
  children: React.ReactNode;
  onUnassign?: (courseId: string) => void;
  isMatch?: boolean;
  className?: string;
}

export default function DroppableSlot({ slotKey, children, onUnassign, isMatch = false, className }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: slotKey });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isOver ? 0.8 : 1 }}
      className={`relative w-full h-full h-auto border-2 border-dashed ${isMatch ? 'border-blue-400 bg-blue-50' : 'border-slate-200'} rounded-lg transition-all ${isOver ? 'bg-blue-100 border-blue-500' : ''} ${className}`}
      onDoubleClick={() => {
        if (children && onUnassign) {
          // Extract course ID from children if needed
          const courseElement = children as any;
          if (courseElement?.props?.course?.id) {
            onUnassign(courseElement.props.course.id);
          }
        }
      }}
    >
      {children}
    </div>
  );
}
