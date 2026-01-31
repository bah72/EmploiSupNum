import React from 'react';
import { Search, Save, Printer } from 'lucide-react';
import { SEMESTERS } from '../constants';

interface HeaderBannerProps {
  semester: string;
  setSemester: (value: string) => void;
  group: string;
  setGroup: (value: string) => void;
  week: number;
  setWeek: (value: number) => void;
  totalWeeks: number;
  startStr: string;
  endStr: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleExportPDF: () => void;
  isExporting: boolean;
  handlePrint?: () => void;
  dynamicGroups: string[];
  config: any;
}

export const HeaderBanner = React.memo(({
  semester, setSemester, group, setGroup, week, setWeek, totalWeeks,
  startStr, endStr, searchQuery, setSearchQuery, handleExportPDF,
  isExporting, dynamicGroups, config, handlePrint
}: HeaderBannerProps) => {
  return (
    <div className="flex flex-col bg-white shrink-0 shadow-sm z-40" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
      <div className="flex items-center justify-between w-full h-14 md:h-16 bg-green-700 px-3 md:px-6 overflow-hidden">
        <div className="shrink-0 pr-2 md:pr-4 h-full flex items-center">
          <img src="/rim.png" alt="RIM" className="h-8 md:h-10 w-auto object-contain" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-base md:text-lg font-semibold text-white leading-tight tracking-wide">Institut Supérieur du Numérique</h1>
          <h2 className="text-[11px] md:text-xs font-medium text-green-100 uppercase tracking-widest">Emploi du temps</h2>
        </div>
        <div className="shrink-0 pl-2 md:pl-4 h-full flex items-center">
          <img src="/supnum.png" alt="SupNum" className="h-8 md:h-10 w-auto object-contain" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 gap-2 w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
            <span className="mr-1 text-black-800 font-bold text-[10px]">Semestre:</span>
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
            <span className="mr-1 text-black-800 font-bold text-[10px]">Groupe:</span>
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
              {dynamicGroups.map((g: string) => <option key={g} value={g}>{g.replace("Groupe ","G")}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
            <span className="mr-1 text-black-800 font-bold text-[10px]">Semaine:</span>
            <select value={week} onChange={(e) => setWeek(parseInt(e.target.value))} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
              {Array.from({ length: totalWeeks }, (_, i) => {
                const weekNum = i + 1;
                return (
                  <option key={weekNum} value={weekNum}>
                    {weekNum}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="hidden sm:flex text-[12px] text-slate-600 font-medium">
          Du&nbsp;&nbsp;<span className="text-blue-700 font-bold">{startStr}</span>&nbsp;&nbsp;au&nbsp;&nbsp;<span className="text-blue-700 font-bold">{endStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Chercher..." 
              className="w-28 focus:w-40 bg-white border border-slate-300 rounded-full py-1 pl-6 pr-4 text-[12px] font-medium transition-all outline-none" 
            />
          </div>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting} 
            className="flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded p-1.5 shadow-sm transition-all" 
            title="Sauvegarder"
          >
            <Save size={14} />
          </button>
          {handlePrint && (
            <button 
              onClick={handlePrint} 
              className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded p-1.5 shadow-sm transition-all" 
              title="Imprimer"
            >
              <Printer size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});