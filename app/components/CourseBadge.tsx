"use client";

import React from 'react';
import { Users, MapPin } from 'lucide-react';

function getCourseColor(type: string) {
  switch (type) {
    case 'CM': return { border: 'border-blue-400', borderLeft: 'border-l-blue-600', bg: 'bg-blue-50' };
    case 'TD': return { border: 'border-green-400', borderLeft: 'border-l-green-600', bg: 'bg-green-50' };
    case 'TP': return { border: 'border-purple-400', borderLeft: 'border-l-purple-600', bg: 'bg-purple-50' };
    default: return { border: 'border-slate-400', borderLeft: 'border-l-slate-600', bg: 'bg-slate-50' };
  }
}

interface CourseBadgeProps {
  course: any;
  compact: boolean;
  customSubjects: any;
  schedule: any;
  assignmentRows: any;
  searchQuery?: string;
  onUnassign?: (courseId: string) => void;
  isMatch?: boolean;
  hasConflict?: boolean;
  className?: string;
}

export default function CourseBadge({ course, compact, customSubjects, schedule, assignmentRows, searchQuery, onUnassign, isMatch, hasConflict, className }: CourseBadgeProps) {
  const colors = getCourseColor(course.type);
  const compactClasses = compact ? "p-1" : "p-3";
  const compactTextClasses = compact ? "text-[10px]" : "text-[12px]";
  const compactSmallTextClasses = compact ? "text-[7px]" : "text-[9px]";

  const getSessionsInfo = () => {
    const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
    const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
    const credit = matiereData?.credit || 3;
    const totalSessions = credit * 8;
    const similarCourses = (assignmentRows || []).filter((r: any) =>
      r.subject === course.subject && r.type === course.type && r.teacher === course.teacher && r.room === course.room && r.semester === course.semester
    );
    const similarCourseIds = new Set(similarCourses.map((c: any) => c.id));
    similarCourseIds.add(course.id);
    let realizedSessions = 0;
    if (schedule && assignmentRows) {
      Object.entries(schedule).forEach(([key, courseIds]) => {
        const courseIdsArray = Array.isArray(courseIds) ? courseIds : (courseIds ? [courseIds] : []);
        if (courseIdsArray.some((id: string) => similarCourseIds.has(id))) { realizedSessions++; }
      });
    }
    return { realized: realizedSessions, total: totalSessions };
  };

  const sessionsInfo = getSessionsInfo();

  // Forcer l'affichage d'un seul enseignant pour les CM
  let teacher, room;
  if (course.type === 'CM') {
    teacher = (course.teacher || '').split('/')[0]?.trim() || '';
    room = (course.room || '').split('/')[0]?.trim() || '';
  } else {
    teacher = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
    room = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
  }

  return (
    <div className={`relative w-full rounded border-[1.5px] ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} ${compactClasses} transition-all shadow-sm ${className}`}>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`${compactTextClasses} font-black text-slate-800 leading-tight truncate flex-1`}>{course.type}</span>
            <span className={`${compactSmallTextClasses} font-black px-1 py-0.5 rounded shadow-sm shrink-0 ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {sessionsInfo.realized}/{sessionsInfo.total}
            </span>
          </div>
          <span title={course.subject} className={`${compactTextClasses} text-slate-700 leading-tight break-all mt-0.5`}>{course.subject}</span>
        </div>
        <div className="flex flex-col gap-0.5 mt-auto min-w-0">
          <div className="flex flex-col bg-white/60 rounded px-1 py-0.5 border border-slate-100/50 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <Users size={8} className="text-slate-400 shrink-0" />
              <span className={`${compactSmallTextClasses} font-normal text-red-600 truncate min-w-0 flex-1`}>{teacher || '?'}</span>
            </div>
            <div className="flex items-center gap-1 border-t border-slate-100/30 mt-0.5 pt-0.5 min-w-0">
              <MapPin size={8} className="text-slate-400 shrink-0" />
              <span className={`${compactSmallTextClasses} font-normal text-blue-800 truncate min-w-0 flex-1`}>{room || '?'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
