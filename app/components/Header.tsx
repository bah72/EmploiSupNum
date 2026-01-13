"use client";

import React from "react";

type Props = {
  semester?: string;
  groupDisplay?: string;
  week?: number;
  startStr?: string;
  endStr?: string;
  yearLabel?: string;
  onSemesterChange?: (s: string) => void;
};

export default function Header({ semester = "S1", groupDisplay = "-", week = 1, startStr = "", endStr = "", yearLabel = "2025-2026", onSemesterChange }: Props) {
  return (
    <header className="supnum-header bg-[#d6e7b5] border-b border-green-300 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <img src="/left-logo.svg" alt="left logo" className="w-12 h-12 rounded-full object-cover" />

          <div className="flex-1 text-center">
            <div className="text-2xl font-bold">SupNum: Emploi du temps</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-slate-800">{yearLabel}</div>
            <img src="/right-logo.svg" alt="right logo" className="w-12 h-12 rounded-full object-cover" />
          </div>
        </div>

          <div className="mt-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="font-bold">Semestre: 
              {onSemesterChange ? (
                <select value={semester} onChange={(e) => onSemesterChange(e.target.value)} className="text-blue-600 ml-1 font-bold bg-transparent border border-transparent focus:border-indigo-200 rounded px-1">
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
              ) : (
                <span className="text-blue-600">{semester}</span>
              )}
            </div>
            <div className="font-bold">Groupe: <span className="text-blue-600">{groupDisplay}</span></div>
            <div className="font-bold">Semaine: <span className="text-blue-600">{week}</span></div>
          </div>
          <div className="text-sm">
            <span className="mr-2">du <span className="text-blue-600">{startStr}</span></span>
            <span>au <span className="text-blue-600">{endStr}</span></span>
          </div>
        </div>
      </div>
    </header>
  );
}
