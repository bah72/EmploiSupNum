"use client";

import React, { useState } from 'react';
import { Users, Search, X } from 'lucide-react';

interface TeacherSelectorProps {
  value: string;
  onChange: (value: string) => void;
  allTeachers: string[];
  placeholder?: string;
  className?: string;
}

export default function TeacherSelector({ value, onChange, allTeachers, placeholder = "Sélectionner les enseignants", className = "" }: TeacherSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const teachers = value.split('/').map(t => t.trim()).filter(Boolean);

  const removeTeacher = (teacherToRemove: string) => {
    const newTeachers = teachers.filter(t => t !== teacherToRemove);
    onChange(newTeachers.join('/'));
  };

  return (
    <div className="relative">
      <div 
        className={`flex flex-wrap gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer min-h-[40px] items-center ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        {teachers.length === 0 ? (
          <span className="text-slate-400 text-sm">{placeholder}</span>
        ) : (
          teachers.map((teacher, index) => (
            <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium flex items-center gap-1">
              {teacher}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTeacher(teacher);
                }}
                className="text-blue-500 hover:text-blue-700"
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      {isModalOpen && (
        <TeacherSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedTeachers={value}
          allTeachers={allTeachers}
          onSelect={onChange}
        />
      )}
    </div>
  );
}

interface TeacherSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeachers: string;
  allTeachers: string[];
  onSelect: (teachers: string) => void;
}

function TeacherSelectionModal({ isOpen, onClose, selectedTeachers, allTeachers, onSelect }: TeacherSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const selectedList = (selectedTeachers || '').split('/').map((t: string) => t.trim()).filter(Boolean);

  const filteredTeachers = allTeachers.filter(teacher =>
    teacher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeacher = (teacher: string) => {
    let newList;
    if (selectedList.includes(teacher)) {
      newList = selectedList.filter(t => t !== teacher);
    } else {
      newList = [...selectedList, teacher];
    }
    onSelect(newList.join('/'));
  };

  const handleAddNew = () => {
    if (newTeacher.trim() && !allTeachers.includes(newTeacher.trim())) {
      const newList = [...selectedList, newTeacher.trim()];
      onSelect(newList.join('/'));
      setNewTeacher('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Sélectionner les enseignants</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Chercher parmi les profs existants..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 ring-blue-500/10 outline-none transition-all" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
            {filteredTeachers.map((teacher: string) => (
              <label key={teacher} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedList.includes(teacher) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedList.includes(teacher) ? 'bg-white border-white' : 'border-slate-300 bg-white'}`}>
                  {selectedList.includes(teacher) && <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />}
                </div>
                <input type="checkbox" checked={selectedList.includes(teacher)} onChange={() => toggleTeacher(teacher)} className="hidden" />
                <span className="text-sm font-bold tracking-tight">{teacher}</span>
              </label>
            ))}
            {filteredTeachers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <Search size={32} className="opacity-20 mb-2" />
                <p className="text-xs italic font-medium">Aucun enseignant trouvé pour "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-bold uppercase">{selectedList.length} sélectionné{selectedList.length > 1 ? 's' : ''}</div>
          <button onClick={onClose} className="bg-slate-900 border border-slate-800 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition-all uppercase tracking-widest">Terminer</button>
        </div>
      </div>
    </div>
  );
}
