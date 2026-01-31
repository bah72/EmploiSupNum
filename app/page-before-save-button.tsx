"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { 
  LayoutDashboard, Calendar, Settings, X, AlertTriangle, Search, FileDown, Trash2, Split, Users, Filter, MapPin, Plus, Minus, Database
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { AssignmentRow, CourseType } from './types';
import { MASTER_DB, ALL_ROOMS, MAIN_GROUPS, DAYS, SEMESTERS } from './constants';
import { HeaderBanner } from './components/HeaderBanner';

export default function App() {
    const [isClient, setIsClient] = useState(false);
    const [semester, setSemester] = useState<string>('S1');
    const [activeTab, setActiveTab] = useState<'manage' | 'planning' | 'config' | 'data'>('planning'); 
    const [activeMainGroup, setActiveMainGroup] = useState("Groupe 1");
    const [currentWeek, setCurrentWeek] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
    const [manageFilterCode, setManageFilterCode] = useState<string>("");
    
    // États pour la gestion des données
    const [dataSubTab, setDataSubTab] = useState<'rooms' | 'subjects' | 'progress'>('subjects');
    const [dataFilterSemester, setDataFilterSemester] = useState<string>("");
    const [dataFilterSubject, setDataFilterSubject] = useState<string>("");
    const [showDataMenu, setShowDataMenu] = useState(false);
    
    // État principal pour les cours et le planning
    const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
    const [schedule, setSchedule] = useState<Record<string, string | null>>({});
    const [activeDragItem, setActiveDragItem] = useState<AssignmentRow | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Données modifiables
    const [customRooms, setCustomRooms] = useState<string[]>([...ALL_ROOMS]);
    const [customSubjects, setCustomSubjects] = useState(() => {
        const converted = JSON.parse(JSON.stringify(MASTER_DB)).map((semester: any) => ({
            ...semester,
            matieres: semester.matieres.map((matiere: any) => ({
                ...matiere,
                enseignantsCM: matiere.enseignants,
                enseignantsTD: matiere.enseignants
            }))
        }));
        return converted;
    });
    
    // Configuration
    const [config, setConfig] = useState({
        startDate: '2024-09-02',
        totalWeeks: 16,
        numberOfGroups: 4,
        vacationPeriods: [] as Array<{startDate: string, endDate: string}>,
        timeSlots: ['08:00-09:30', '09:45-11:15', '11:30-13:00', '14:00-15:30', '15:45-17:15']
    });

    // Initialisation côté client optimisée
    useEffect(() => {
        setIsClient(true);
        
        // Charger toutes les données en une fois
        const loadData = () => {
            try {
                const savedConfig = localStorage.getItem('supnum_config_v67');
                if (savedConfig) setConfig(JSON.parse(savedConfig));
                
                const savedRooms = localStorage.getItem('supnum_custom_rooms');
                if (savedRooms) setCustomRooms(JSON.parse(savedRooms));
                
                const savedSubjects = localStorage.getItem('supnum_custom_subjects');
                if (savedSubjects) setCustomSubjects(JSON.parse(savedSubjects));
                
                const savedAssignmentRows = localStorage.getItem('supnum_assignment_rows');
                if (savedAssignmentRows) {
                    setAssignmentRows(JSON.parse(savedAssignmentRows));
                }
                
                const savedSchedule = localStorage.getItem('supnum_schedule');
                if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            }
        };

        loadData();
    }, []);

    // Sauvegarde optimisée avec debounce
    useEffect(() => {
        if (!isClient) return;
        
        const saveData = () => {
            try {
                if (assignmentRows.length > 0) {
                    localStorage.setItem('supnum_assignment_rows', JSON.stringify(assignmentRows));
                }
                if (customSubjects.length > 0) {
                    localStorage.setItem('supnum_custom_subjects', JSON.stringify(customSubjects));
                }
                if (Object.keys(schedule).length > 0) {
                    localStorage.setItem('supnum_schedule', JSON.stringify(schedule));
                }
                localStorage.setItem('supnum_config_v67', JSON.stringify(config));
                if (customRooms.length > 0) {
                    localStorage.setItem('supnum_custom_rooms', JSON.stringify(customRooms));
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
            }
        };

        const timeoutId = setTimeout(saveData, 500);
        return () => clearTimeout(timeoutId);
    }, [assignmentRows, customSubjects, schedule, config, customRooms, isClient]);

    // Calculs mémorisés pour les performances
    const uniqueTeachers = useMemo(() => {
        const set = new Set<string>();
        customSubjects.forEach((sem: any) => 
            sem.matieres?.forEach((m: any) => {
                if (m.enseignantsCM) {
                    m.enseignantsCM.split('/').forEach((t: any) => { 
                        if(t.trim()) set.add(t.trim()); 
                    });
                }
                if (m.enseignantsTD) {
                    m.enseignantsTD.split('/').forEach((t: any) => { 
                        if(t.trim()) set.add(t.trim()); 
                    });
                }
                if (m.enseignants && !m.enseignantsCM && !m.enseignantsTD) {
                    m.enseignants.split('/').forEach((t: any) => { 
                        if(t.trim()) set.add(t.trim()); 
                    });
                }
            })
        );
        return Array.from(set).sort();
    }, [customSubjects]);

    const subjectNames = useMemo(() => {
        const names: Record<string, string> = {};
        customSubjects.forEach((sem: any) => 
            sem.matieres?.forEach((m: any) => { 
                names[m.code] = m.libelle; 
            })
        );
        return names;
    }, [customSubjects]);

    const dynamicGroups = useMemo(() => {
        return Array.from({ length: config.numberOfGroups }, (_, i) => `Groupe ${i + 1}`);
    }, [config.numberOfGroups]);

    // Fonction d'initialisation des données par défaut
    const initializeDefaultData = useCallback(() => {
        const newRows: AssignmentRow[] = [];
        
        customSubjects.forEach((semData: any) => {
            semData.matieres.forEach((matiere: any) => {
                dynamicGroups.forEach(group => {
                    const teachersCM = matiere.enseignantsCM || matiere.enseignants || '';
                    const teachersTD = matiere.enseignantsTD || matiere.enseignants || '';
                    
                    let defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";
                    
                    // Ligne CM
                    newRows.push({ 
                        id: Math.random().toString(36).substr(2, 9), 
                        subject: matiere.code, 
                        subjectLabel: matiere.libelle, 
                        type: 'CM', 
                        mainGroup: group, 
                        sharedGroups: [group], 
                        subLabel: 'CM', 
                        teacher: teachersCM.split('/')[0]?.trim() || '', 
                        room: 'Amphi A', 
                        semester: semData.semestre 
                    });
                    
                    // Ligne TD
                    newRows.push({ 
                        id: Math.random().toString(36).substr(2, 9), 
                        subject: matiere.code, 
                        subjectLabel: matiere.libelle, 
                        type: 'TD', 
                        mainGroup: group, 
                        sharedGroups: [group], 
                        subLabel: 'TD', 
                        teacher: teachersTD.split('/')[0]?.trim() || '', 
                        room: defaultRoom, 
                        semester: semData.semestre 
                    });
                });
            });
        });
        
        setAssignmentRows(newRows);
    }, [customSubjects, dynamicGroups]);

    // Calculs mémorisés pour le planning
    const groupCourses = useMemo(() => 
        assignmentRows.filter(r => r.mainGroup === activeMainGroup && r.semester === semester),
        [assignmentRows, activeMainGroup, semester]
    );
    
    const placedIdsThisWeek = useMemo(() => 
        Object.keys(schedule)
            .filter(k => k.startsWith(`${semester}|w${currentWeek}|${activeMainGroup}|`) && schedule[k])
            .map(k => schedule[k]),
        [schedule, semester, currentWeek, activeMainGroup]
    );
    
    const sidebarCourses = useMemo(() => 
        groupCourses.filter(c => !placedIdsThisWeek.includes(c.id)),
        [groupCourses, placedIdsThisWeek]
    );

    // Calcul des dates de la semaine
    const weekDates = useMemo(() => {
        const startDate = new Date(config.startDate);
        const vacationPeriods = config.vacationPeriods || [];
        
        let actualWeekCount = 0;
        let currentDate = new Date(startDate);
        
        while (actualWeekCount < currentWeek) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            let isWeekInVacation = true;
            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                const isInVacation = vacationPeriods.some(period => {
                    const start = new Date(period.startDate);
                    const end = new Date(period.endDate);
                    return d >= start && d <= end;
                });
                if (!isInVacation) {
                    isWeekInVacation = false;
                    break;
                }
            }
            
            if (!isWeekInVacation) {
                actualWeekCount++;
            }
            
            if (actualWeekCount < currentWeek) {
                currentDate.setDate(currentDate.getDate() + 7);
            }
        }
        
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(currentDate.getDate() + 4);
        
        return {
            startStr: currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            endStr: weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
    }, [config.startDate, config.vacationPeriods, currentWeek]);

    // Détection des conflits
    const conflicts = useMemo(() => {
        const conflictSet = new Set<string>();
        const timeSlotMap: Record<string, string[]> = {};
        
        Object.entries(schedule).forEach(([key, courseId]) => {
            if (!courseId) return;
            const [sem, week, group, day, time] = key.split('|');
            if (sem !== semester || week !== `w${currentWeek}` || group !== activeMainGroup) return;
            
            const slotKey = `${day}|${time}`;
            if (!timeSlotMap[slotKey]) timeSlotMap[slotKey] = [];
            timeSlotMap[slotKey].push(courseId);
        });
        
        Object.values(timeSlotMap).forEach(courseIds => {
            if (courseIds.length > 1) {
                courseIds.forEach(id => conflictSet.add(id));
            }
        });
        
        return conflictSet;
    }, [schedule, semester, currentWeek, activeMainGroup]);

    // Fonctions mémorisées
    const checkInstantConflict = useCallback((courseId: string, day: string, time: string): string | null => {
        const slotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
        const existingCourse = schedule[slotKey];
        
        if (existingCourse && existingCourse !== courseId) {
            const existing = assignmentRows.find(r => r.id === existingCourse);
            return `Conflit détecté avec ${existing?.subject || 'un autre cours'}`;
        }
        
        return null;
    }, [schedule, semester, currentWeek, activeMainGroup, assignmentRows]);

    const handleExportPDF = useCallback(async () => {
        const element = document.getElementById('calendar-capture-zone');
        if (!element) return;
        setIsExporting(true);
        try {
            const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2, backgroundColor: "#ffffff" });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`Planning_${semester}_${activeMainGroup}.pdf`);
        } catch (err) { 
            alert("Erreur export PDF"); 
        } finally { 
            setIsExporting(false); 
        }
    }, [semester, activeMainGroup]);

    const handleDragEnd = useCallback((e: DragEndEvent) => {
        setActiveDragItem(null);
        const { active, over } = e;
        if (!over) return;
        
        const sourceId = active.id as string;
        const originalCourse = assignmentRows.find(r => r.id === sourceId);
        if (!originalCourse) return;
        
        const targetTimeSlot = over.id as string; 
        const [tDay, tTime] = targetTimeSlot.split('|');
        const conflictMsg = checkInstantConflict(sourceId, tDay, tTime);
        
        if (conflictMsg) {
            setToastMessage({ msg: conflictMsg, type: 'error' });
            return;
        }
        
        const isCtrlPressed = (e as any).activatorEvent?.ctrlKey || (e as any).activatorEvent?.metaKey;
        
        if (isCtrlPressed) {
            const newCourse: AssignmentRow = {
                ...originalCourse,
                id: Math.random().toString(36).substr(2, 9),
            };
            
            setAssignmentRows(prev => [...prev, newCourse]);
            setSchedule(prev => ({
                ...prev,
                [`${semester}|w${currentWeek}|${activeMainGroup}|${targetTimeSlot}`]: newCourse.id
            }));
            
            setToastMessage({ msg: `Copie de ${originalCourse.subject} créée`, type: 'success' });
        } else {
            setSchedule(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { 
                    if (k.startsWith(`${semester}|w${currentWeek}|${activeMainGroup}|`) && next[k] === sourceId) 
                        next[k] = null; 
                });
                next[`${semester}|w${currentWeek}|${activeMainGroup}|${targetTimeSlot}`] = sourceId;
                return next;
            });
        }
    }, [assignmentRows, checkInstantConflict, semester, currentWeek, activeMainGroup]);

    // Masquer automatiquement les messages toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Fermer le menu données quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDataMenu && !(event.target as Element)?.closest('.data-menu-container')) {
                setShowDataMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDataMenu]);

    if (!isClient) return null;

    const gridTemplate = `40px repeat(${config.timeSlots.length}, minmax(0, 1fr))`;
    const gridBaseClasses = "grid w-full";

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden relative" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
            {toastMessage && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999]">
                    <div className={`px-4 py-2 rounded-lg shadow-xl font-bold text-white flex items-center gap-2 ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <AlertTriangle size={18}/>
                        <span className="text-xs">{toastMessage.msg}</span>
                        <button onClick={() => setToastMessage(null)}><X size={14}/></button>
                    </div>
                </div>
            )}

            <HeaderBanner 
                semester={semester} setSemester={setSemester}
                group={activeMainGroup} setGroup={setActiveMainGroup}
                week={currentWeek} setWeek={setCurrentWeek}
                totalWeeks={config.totalWeeks}
                startStr={weekDates.startStr} endStr={weekDates.endStr}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                handleExportPDF={handleExportPDF} isExporting={isExporting}
                dynamicGroups={dynamicGroups}
                config={config}
            />

            <div className="flex flex-1 overflow-hidden"> 
                <aside className="w-12 bg-slate-900 text-slate-400 flex flex-col items-center py-4 gap-6 shrink-0 z-30">
                    <button onClick={() => setActiveTab('planning')} className={`p-2 rounded-xl transition-colors ${activeTab === 'planning' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Planning">
                        <Calendar size={20}/>
                    </button>
                    <button onClick={() => setActiveTab('manage')} className={`p-2 rounded-xl transition-colors ${activeTab === 'manage' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Gestion">
                        <LayoutDashboard size={20}/>
                    </button>
                    
                    {/* Menu Données avec dropdown */}
                    <div className="relative data-menu-container">
                        <button 
                            onClick={() => {
                                setShowDataMenu(!showDataMenu);
                                if (!showDataMenu) {
                                    setActiveTab('data');
                                }
                            }} 
                            className={`p-2 rounded-xl transition-colors ${activeTab === 'data' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} 
                            title="Données"
                        >
                            <Database size={20}/>
                        </button>
                        
                        {/* Menu déroulant */}
                        {showDataMenu && (
                            <div className="absolute left-14 top-0 bg-white border border-slate-200 rounded-lg shadow-xl z-50 min-w-48 overflow-hidden animate-in slide-in-from-left-2 duration-200">
                                <div className="py-2">
                                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                        Gestion des données
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setDataSubTab('subjects');
                                            setActiveTab('data');
                                            setShowDataMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${dataSubTab === 'subjects' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        Matières & Enseignants
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setDataSubTab('rooms');
                                            setActiveTab('data');
                                            setShowDataMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${dataSubTab === 'rooms' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        Salles de cours
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setDataSubTab('progress');
                                            setActiveTab('data');
                                            setShowDataMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${dataSubTab === 'progress' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Avancement
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => setActiveTab('config')} className={`p-2 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Configuration">
                        <Settings size={20}/>
                    </button>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 h-full">
                    {activeTab === 'planning' && (
                        <DndContext onDragStart={(e) => setActiveDragItem(assignmentRows.find(r => r.id === e.active.id) || null)} onDragEnd={handleDragEnd}>
                            <div className="flex flex-1 overflow-hidden h-full">
                                <div className="w-48 bg-white border-r border-slate-200 flex flex-col shrink-0 p-2">
                                    <div className="px-3 py-2 border-b text-[12px] font-bold text-slate-700 uppercase text-left bg-white">
                                        À Placer <span className="text-sm text-slate-400">({sidebarCourses.length})</span>
                                    </div>
                                    
                                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                                        <div className="flex items-center gap-2 text-[10px] text-blue-700">
                                            <span className="font-bold">💡</span>
                                            <span className="font-medium">Maintenez <kbd className="px-1 py-0.5 bg-blue-200 rounded text-[9px] font-bold">Ctrl</kbd> + glisser pour copier</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                        {sidebarCourses.map(c => (
                                            <DraggableCard key={`${c.id}-${refreshKey}`} course={c} searchQuery={searchQuery} compact />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 p-2 bg-slate-200 overflow-hidden flex flex-col min-h-0">
                                    <div id="calendar-capture-zone" className="flex-1 bg-white rounded-lg shadow border border-slate-300 overflow-auto flex flex-col min-h-0">
                                        <div style={{ gridTemplateColumns: gridTemplate }} className={`${gridBaseClasses} border-b border-slate-200 bg-slate-50 sticky top-0 z-20`}>
                                            <div className="p-2 border-r text-center text-[10px] font-bold text-slate-400">H</div>
                                            {config.timeSlots.map(t => (
                                                <div key={t} className="p-2 border-r last:border-0 text-center text-[10px] font-black text-slate-700 uppercase">{t}</div>
                                            ))}
                                        </div>
                                        
                                        <div className="flex-1 overflow-auto bg-slate-50/30 space-y-1 min-h-0">
                                            {DAYS.map(day => (
                                                <div key={day} style={{ gridTemplateColumns: gridTemplate }} className={`${gridBaseClasses} w-full border-b border-slate-200 bg-white items-start overflow-visible min-h-0`}>
                                                    <div className="border-r border-slate-200 bg-slate-100 flex items-center justify-center py-1 self-start overflow-visible min-h-[44px]">
                                                        <span className="inline-block font-black text-slate-900 text-[11px] -rotate-90 uppercase tracking-widest leading-none whitespace-nowrap">{day}</span>
                                                    </div>
                                                    {config.timeSlots.map(time => {
                                                        const slotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
                                                        const course = schedule[slotKey] ? assignmentRows.find(c => c.id === schedule[slotKey]) : null;
                                                        return (
                                                            <div key={time} className="p-1 border-r last:border-0 relative">
                                                                <DroppableSlot id={`${day}|${time}`}>
                                                                    {course && (
                                                                        <CourseBadge 
                                                                            key={`${course.id}-${refreshKey}`} 
                                                                            course={course} 
                                                                            hasConflict={conflicts.has(course.id)} 
                                                                            searchQuery={searchQuery} 
                                                                            onUnassign={() => {
                                                                                setSchedule(prev => {
                                                                                    const next = { ...prev };
                                                                                    Object.keys(next).forEach(k => { if (next[k] === course.id) next[k] = null; });
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                        />
                                                                    )}
                                                                </DroppableSlot>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DragOverlay>
                                {activeDragItem ? (
                                    <div className="opacity-90 w-36 shadow-2xl rotate-1">
                                        <DraggableCard course={activeDragItem} compact />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}

                    {activeTab === 'manage' && (
                        <div className="p-6 overflow-auto h-full bg-slate-50">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Gestion des cours</h2>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Filtrer..." 
                                        value={manageFilterCode} 
                                        onChange={(e) => setManageFilterCode(e.target.value)}
                                        className="text-xs border border-slate-200 rounded-md px-2 py-1 outline-none font-bold shadow-sm focus:ring-2 ring-blue-100 w-36"
                                    />
                                    <button onClick={() => {
                                        const newCourse: AssignmentRow = {
                                            id: Math.random().toString(36).substr(2, 9),
                                            subject: 'NEW' + Date.now(),
                                            subjectLabel: 'Nouveau Cours',
                                            type: 'CM',
                                            mainGroup: activeMainGroup,
                                            sharedGroups: [activeMainGroup],
                                            subLabel: 'CM',
                                            teacher: 'Nouvel Enseignant',
                                            room: '101',
                                            semester: semester
                                        };
                                        setAssignmentRows(prev => [...prev, newCourse]);
                                    }} className="bg-green-50 text-green-600 hover:bg-green-100 px-4 py-1.5 rounded-md text-xs font-bold border border-green-200 shadow-sm transition-colors uppercase tracking-wider">
                                        + Cours
                                    </button>
                                    <button onClick={() => {
                                        if (!confirm("Réinitialiser tous les cours ?")) return;
                                        initializeDefaultData();
                                        setSchedule({});
                                    }} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded-md text-xs font-bold border border-red-200 shadow-sm transition-colors uppercase tracking-wider">
                                        Réinitialiser
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-xs text-left border-collapse table-fixed">
                                    <thead className="bg-green-700 font-bold text-xs uppercase text-white tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-1 border-r border-green-600 w-10 text-center">Sem</th>
                                            <th className="p-1 border-r border-green-600 w-12 text-center">Groupe</th>
                                            <th className="p-1 border-r border-green-600 w-28">Matière</th>
                                            <th className="p-1 border-r border-green-600 w-12 text-center">Type</th>
                                            <th className="p-1 border-r border-green-600 w-[140px]">Enseignants & Salles</th>
                                            <th className="p-1 text-center w-16">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {assignmentRows.filter(r => 
                                            r.mainGroup === activeMainGroup &&
                                            r.semester === semester && 
                                            r.subject.toLowerCase().includes(manageFilterCode.toLowerCase())
                                        ).map(row => {
                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="p-1 font-bold text-slate-500 border-r border-slate-50 text-center text-xs">{row.semester}</td>
                                                    <td className="p-1 border-r border-slate-50 font-black text-slate-700 text-center text-xs">
                                                        <span className="text-[11px] uppercase tracking-wide whitespace-nowrap">{row.mainGroup.replace("Groupe ","G")}</span>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50 truncate">
                                                        <div className="flex flex-col truncate">
                                                            <span className="font-bold text-green-900 text-[12px] truncate leading-tight mb-0.5">{row.subject}</span>
                                                            <span className="text-[10px] text-slate-400 italic truncate leading-tight">{row.subjectLabel}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50 text-center px-1">
                                                        <select value={row.type} onChange={(e) => {
                                                            setAssignmentRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value as CourseType } : r));
                                                        }} className={`font-black rounded px-1 py-0.5 text-[11px] w-full ${getCourseColor(row.type).badge} text-white shadow-sm outline-none cursor-pointer text-center`}>
                                                            <option value="CM">CM</option>
                                                            <option value="TD">TD</option>
                                                            <option value="TP">TP</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50">
                                                        <div className="flex gap-2 items-center">
                                                            <select 
                                                                value={row.teacher || ""} 
                                                                onChange={(e) => {
                                                                    setAssignmentRows(prev => prev.map(r => 
                                                                        r.id === row.id ? { ...r, teacher: e.target.value } : r
                                                                    ));
                                                                }} 
                                                                className="flex-1 border border-slate-200 rounded px-2 py-1 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-green-300 shadow-sm"
                                                            >
                                                                <option value="">Enseignant...</option>
                                                                {uniqueTeachers.map(teacher => (
                                                                    <option key={teacher} value={teacher}>{teacher}</option>
                                                                ))}
                                                            </select>
                                                            
                                                            <select 
                                                                value={row.room || ""} 
                                                                onChange={(e) => {
                                                                    setAssignmentRows(prev => prev.map(r => 
                                                                        r.id === row.id ? { ...r, room: e.target.value } : r
                                                                    ));
                                                                }} 
                                                                className="w-20 border border-slate-200 rounded px-2 py-1 bg-white font-mono font-bold text-[10px] outline-none focus:ring-1 ring-green-300 shadow-sm text-center"
                                                            >
                                                                <option value="">Salle...</option>
                                                                {customRooms.map(room => (
                                                                    <option key={room} value={room}>{room}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button 
                                                            onClick={() => { 
                                                                if(confirm('Supprimer ce cours ?')) 
                                                                    setAssignmentRows(prev => prev.filter(r => r.id !== row.id)) 
                                                            }} 
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all shadow-sm" 
                                                            title="Supprimer ce cours"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="p-6 overflow-auto h-full bg-slate-50">
                            <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight mb-6">Configuration</h2>
                            
                            <div className="space-y-6">
                                {/* Configuration générale */}
                                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Settings size={18}/>
                                        Paramètres généraux
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Date de début</label>
                                            <input 
                                                type="date" 
                                                value={config.startDate} 
                                                onChange={(e) => setConfig({...config, startDate: e.target.value})}
                                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de semaines</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="52" 
                                                value={config.totalWeeks} 
                                                onChange={(e) => setConfig({...config, totalWeeks: parseInt(e.target.value)})}
                                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de groupes</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="10" 
                                                value={config.numberOfGroups} 
                                                onChange={(e) => setConfig({...config, numberOfGroups: parseInt(e.target.value)})}
                                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Configuration des créneaux horaires */}
                                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Calendar size={18}/>
                                        Créneaux horaires
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {config.timeSlots.map((slot, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    value={slot} 
                                                    onChange={(e) => {
                                                        const newSlots = [...config.timeSlots];
                                                        newSlots[idx] = e.target.value;
                                                        setConfig({...config, timeSlots: newSlots});
                                                    }}
                                                    className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm font-mono outline-none focus:ring-2 ring-blue-100"
                                                    placeholder="HH:MM-HH:MM"
                                                />
                                                <button onClick={() => {
                                                    const newSlots = config.timeSlots.filter((_, i) => i !== idx);
                                                    setConfig({...config, timeSlots: newSlots});
                                                }} className="p-1 text-red-400 hover:text-red-600">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={() => {
                                                const newSlot = "08:00-09:30";
                                                setConfig({...config, timeSlots: [...config.timeSlots, newSlot]});
                                            }}
                                            className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
                                        >
                                            <Plus size={16}/>
                                            Ajouter un créneau
                                        </button>
                                    </div>
                                </section>

                                {/* Gestion des salles */}
                                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <MapPin size={18}/>
                                        Salles disponibles
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                                        {customRooms.map((room, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                                                <input 
                                                    type="text" 
                                                    value={room} 
                                                    onChange={(e) => {
                                                        const newRooms = [...customRooms];
                                                        newRooms[idx] = e.target.value;
                                                        setCustomRooms(newRooms);
                                                    }}
                                                    className="flex-1 border rounded px-2 py-1 text-sm font-mono"
                                                />
                                                <button onClick={() => {
                                                    const newRooms = customRooms.filter((_, i) => i !== idx);
                                                    setCustomRooms(newRooms);
                                                }} className="p-1 text-red-400 hover:text-red-600">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setCustomRooms([...customRooms, `Salle ${customRooms.length + 1}`])}
                                        className="mt-3 flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
                                    >
                                        <Plus size={16}/>
                                        Ajouter une salle
                                    </button>
                                </section>

                                {/* Informations système */}
                                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-md font-bold text-slate-700 mb-4">Informations</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="bg-slate-50 p-3 rounded">
                                            <div className="font-medium text-slate-600">Cours total</div>
                                            <div className="text-lg font-bold text-slate-900">{assignmentRows.length}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded">
                                            <div className="font-medium text-slate-600">Enseignants</div>
                                            <div className="text-lg font-bold text-slate-900">{uniqueTeachers.length}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded">
                                            <div className="font-medium text-slate-600">Salles</div>
                                            <div className="text-lg font-bold text-slate-900">{customRooms.length}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded">
                                            <div className="font-medium text-slate-600">Matières</div>
                                            <div className="text-lg font-bold text-slate-900">{Object.keys(subjectNames).length}</div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="p-6 overflow-auto h-full bg-slate-50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Gestion des Données</h2>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {dataSubTab === 'subjects' ? 'Gérez les matières et leurs enseignants par semestre' : 
                                         dataSubTab === 'rooms' ? 'Gérez les salles de cours disponibles' : 
                                         'Suivez l\'avancement des séances par matière'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <div className={`w-3 h-3 rounded-full ${dataSubTab === 'subjects' ? 'bg-green-500' : dataSubTab === 'rooms' ? 'bg-orange-500' : 'bg-purple-500'}`}></div>
                                    <span className="font-medium">
                                        {dataSubTab === 'subjects' ? 'Matières & Enseignants' : 
                                         dataSubTab === 'rooms' ? 'Salles de cours' : 
                                         'Avancement des cours'}
                                    </span>
                                </div>
                            </div>

                            {/* Gestion des Salles */}
                            {dataSubTab === 'rooms' && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-700">Gestion des Salles</h3>
                                        <button onClick={() => setCustomRooms([...customRooms, `Nouvelle Salle ${customRooms.length + 1}`])} className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors" title="Ajouter une salle">
                                            <Plus size={16} className="mr-2"/>
                                            Ajouter une salle
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                        {customRooms.map((room, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded border">
                                                <input 
                                                    type="text" 
                                                    value={room} 
                                                    onChange={(e) => {
                                                        const newRooms = [...customRooms];
                                                        newRooms[idx] = e.target.value;
                                                        setCustomRooms(newRooms);
                                                    }}
                                                    className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                                                    placeholder="Nom de la salle"
                                                />
                                                <button onClick={() => {
                                                    const newRooms = customRooms.filter((_, i) => i !== idx);
                                                    setCustomRooms(newRooms);
                                                }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gestion des Matières */}
                            {dataSubTab === 'subjects' && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-700">Gestion des Matières</h3>
                                        <div className="flex gap-3 items-center">
                                            <select 
                                                value={dataFilterSemester} 
                                                onChange={(e) => setDataFilterSemester(e.target.value)}
                                                className="border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none focus:ring-2 ring-blue-100"
                                            >
                                                <option value="">Tous les semestres</option>
                                                {SEMESTERS.map(sem => (
                                                    <option key={sem} value={sem}>{sem}</option>
                                                ))}
                                            </select>
                                            
                                            <input 
                                                type="text" 
                                                placeholder="Filtrer par matière..." 
                                                value={dataFilterSubject} 
                                                onChange={(e) => setDataFilterSubject(e.target.value)}
                                                className="border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100 w-48"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {customSubjects
                                            .filter((semestre: any) => !dataFilterSemester || semestre.semestre === dataFilterSemester)
                                            .map((semestre: any, semIdx: number) => (
                                            <div key={semestre.semestre} className="border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">{semestre.semestre}</span>
                                                        {semestre.libelle}
                                                    </h4>
                                                </div>
                                                
                                                <div className="divide-y divide-slate-100">
                                                    {semestre.matieres
                                                        .filter((matiere: any) => !dataFilterSubject || 
                                                            matiere.code.toLowerCase().includes(dataFilterSubject.toLowerCase()) ||
                                                            matiere.libelle.toLowerCase().includes(dataFilterSubject.toLowerCase())
                                                        )
                                                        .map((matiere: any, matIdx: number) => (
                                                        <div key={matiere.code} className="p-4 hover:bg-slate-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="font-bold text-green-700 text-sm bg-green-100 px-2 py-1 rounded">{matiere.code}</span>
                                                                        <span className="font-medium text-slate-800">{matiere.libelle}</span>
                                                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                            {matiere.credit || 3} crédits
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                                        Enseignants CM
                                                                    </label>
                                                                    <div className="flex gap-2">
                                                                        <input 
                                                                            type="text" 
                                                                            value={matiere.enseignantsCM || matiere.enseignants || ''} 
                                                                            onChange={(e) => {
                                                                                const newSubjects = [...customSubjects];
                                                                                newSubjects[semIdx].matieres[matIdx].enseignantsCM = e.target.value;
                                                                                setCustomSubjects(newSubjects);
                                                                            }}
                                                                            className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-green-100"
                                                                            placeholder="Enseignants CM (séparés par /)"
                                                                        />
                                                                        <button 
                                                                            onClick={() => {
                                                                                const newTeacher = prompt('Nom du nouvel enseignant CM:');
                                                                                if (newTeacher && newTeacher.trim()) {
                                                                                    const current = matiere.enseignantsCM || matiere.enseignants || '';
                                                                                    const newValue = current ? current + '/' + newTeacher.trim() : newTeacher.trim();
                                                                                    const newSubjects = [...customSubjects];
                                                                                    newSubjects[semIdx].matieres[matIdx].enseignantsCM = newValue;
                                                                                    setCustomSubjects(newSubjects);
                                                                                    setToastMessage({ msg: `Enseignant CM "${newTeacher.trim()}" ajouté`, type: 'success' });
                                                                                }
                                                                            }}
                                                                            className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors" 
                                                                            title="Ajouter un enseignant CM"
                                                                        >
                                                                            <Plus size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-2">
                                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                                        Intervenants TD/TP
                                                                    </label>
                                                                    <div className="flex gap-2">
                                                                        <input 
                                                                            type="text" 
                                                                            value={matiere.enseignantsTD || matiere.enseignants || ''} 
                                                                            onChange={(e) => {
                                                                                const newSubjects = [...customSubjects];
                                                                                newSubjects[semIdx].matieres[matIdx].enseignantsTD = e.target.value;
                                                                                setCustomSubjects(newSubjects);
                                                                            }}
                                                                            className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                                                            placeholder="Intervenants TD/TP (séparés par /)"
                                                                        />
                                                                        <button 
                                                                            onClick={() => {
                                                                                const newTeacher = prompt('Nom du nouvel intervenant TD/TP:');
                                                                                if (newTeacher && newTeacher.trim()) {
                                                                                    const current = matiere.enseignantsTD || matiere.enseignants || '';
                                                                                    const newValue = current ? current + '/' + newTeacher.trim() : newTeacher.trim();
                                                                                    const newSubjects = [...customSubjects];
                                                                                    newSubjects[semIdx].matieres[matIdx].enseignantsTD = newValue;
                                                                                    setCustomSubjects(newSubjects);
                                                                                    setToastMessage({ msg: `Intervenant TD/TP "${newTeacher.trim()}" ajouté`, type: 'success' });
                                                                                }
                                                                            }}
                                                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors" 
                                                                            title="Ajouter un intervenant TD/TP"
                                                                        >
                                                                            <Plus size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Suivi de l'avancement */}
                            {dataSubTab === 'progress' && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-700 mb-4">Suivi de l'avancement des cours</h3>
                                    
                                    <div className="space-y-4">
                                        {customSubjects.map((semestre: any) => (
                                            <div key={semestre.semestre} className="border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">{semestre.semestre}</span>
                                                        Avancement des matières
                                                    </h4>
                                                </div>
                                                
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {semestre.matieres.map((matiere: any) => {
                                                            const totalSessions = (matiere.credit || 3) * 8;
                                                            
                                                            let realizedSessions = 0;
                                                            Object.entries(schedule).forEach(([key, courseId]) => {
                                                                if (courseId) {
                                                                    const scheduledCourse = assignmentRows.find((row: any) => row.id === courseId);
                                                                    if (scheduledCourse && 
                                                                        scheduledCourse.subject === matiere.code && 
                                                                        scheduledCourse.semester === semestre.semestre) {
                                                                        realizedSessions++;
                                                                    }
                                                                }
                                                            });
                                                            
                                                            const progressPercent = Math.min((realizedSessions / totalSessions) * 100, 100);
                                                            
                                                            return (
                                                                <div key={matiere.code} className="bg-slate-50 p-4 rounded-lg border">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <span className="font-bold text-sm text-slate-800">{matiere.code}</span>
                                                                            <p className="text-xs text-slate-600 truncate">{matiere.libelle}</p>
                                                                        </div>
                                                                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                                                                            progressPercent >= 100 ? 'bg-green-100 text-green-700' :
                                                                            progressPercent >= 75 ? 'bg-blue-100 text-blue-700' :
                                                                            progressPercent >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {Math.round(progressPercent)}%
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="mb-2">
                                                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                                            <span>Séances réalisées</span>
                                                                            <span>{realizedSessions}/{totalSessions}</span>
                                                                        </div>
                                                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                                                            <div 
                                                                                className={`h-2 rounded-full transition-all ${
                                                                                    progressPercent >= 100 ? 'bg-green-500' :
                                                                                    progressPercent >= 75 ? 'bg-blue-500' :
                                                                                    progressPercent >= 50 ? 'bg-yellow-500' :
                                                                                    'bg-red-500'
                                                                                }`}
                                                                                style={{ width: `${progressPercent}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Composants optimisés avec React.memo
const DraggableCard = React.memo(({ course, compact, searchQuery }: any) => {
    if (searchQuery && !course.subject.toLowerCase().includes(searchQuery.toLowerCase())) return null;
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: course.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const colors = getCourseColor(course.type);
    const compactClasses = compact ? 'p-3 text-[12px]' : 'p-2';

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`relative rounded-lg border-2 ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} ${compactClasses} cursor-grab active:cursor-grabbing hover:shadow transition-all shadow-sm`}>
            <div className="absolute top-2 right-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${colors.badge}`}>{course.type}</span>
            </div>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col">
                    <span className="text-[12px] font-black text-slate-900 uppercase truncate" style={{ maxWidth: '7rem' }}>{course.subject}</span>
                    <span className="text-[11px] text-slate-600 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '7rem' }}>{course.subjectLabel}</span>
                </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                <span className="text-[10px] font-normal text-red-600 truncate">{course.teacher}</span>
            </div>
        </div>
    );
});

const DroppableSlot = React.memo(({ id, children }: any) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`w-full min-h-[32px] rounded transition-colors self-start ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10' : ''}`}>
            {children}
        </div>
    );
});

const CourseBadge = React.memo(({ course, hasConflict, searchQuery, onUnassign }: any) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: course.id });
    const colors = getCourseColor(course.type);
    const style = { opacity: isDragging ? 0.4 : 1 };
    const isMatch = searchQuery && course.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} style={style} 
            className={`relative w-full rounded border-2 ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} p-1.5 flex flex-col justify-between group shadow-sm hover:shadow transition-all ${hasConflict ? 'bg-red-50 border-red-500 animate-pulse' : ''} ${isMatch ? 'ring-2 ring-pink-500' : ''}`}>
            <button onPointerDown={(e) => { e.stopPropagation(); onUnassign(); }} className="absolute top-1 right-1 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 no-print z-10 bg-white/80 rounded-full p-0.5">
                <X size={10}/>
            </button>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col pr-2">
                    <span title={course.subject} className="font-medium text-[9px] text-slate-950 leading-none truncate" style={{ maxWidth: '6rem' }}>{course.subject}</span>
                    <span title={course.subjectLabel} className="text-[9px] text-slate-700 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '8rem' }}>{course.subjectLabel}</span>
                </div>
                <span className={`text-[7px] font-black px-1 rounded text-white ${colors.badge}`}>{course.type}</span>
            </div>
            <div className="flex flex-col gap-0.5 mt-auto">
                <div className="flex justify-between items-center bg-white/60 rounded px-1 py-0.5 border border-slate-100/50">
                    <span className="text-[8px] font-normal text-red-600 truncate max-w-[100px]">{course.teacher || '?'}</span>
                    <span className="text-[8px] font-normal text-blue-800">{course.room || '?'}</span>
                </div>
            </div>
        </div>
    );
});

function getCourseColor(type: CourseType) {
  switch(type) {
    case 'CM': return { bg: 'bg-emerald-50', border: 'border-emerald-300', borderLeft: 'border-l-emerald-600', badge: 'bg-emerald-600' };
    case 'TD': return { bg: 'bg-blue-50', border: 'border-blue-300', borderLeft: 'border-l-blue-600', badge: 'bg-blue-600' };
    case 'TP': return { bg: 'bg-orange-50', border: 'border-orange-300', borderLeft: 'border-l-orange-600', badge: 'bg-orange-600' };
    default: return { bg: 'bg-slate-50', border: 'border-slate-300', borderLeft: 'border-l-slate-500', badge: 'bg-slate-500' };
  }
}