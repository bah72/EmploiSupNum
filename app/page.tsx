"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import {
    LayoutDashboard, Calendar, Settings, X, AlertTriangle, Search, FileDown, Trash2, Split, Users, Filter, MapPin, Plus, Minus, Database, Download, Upload, Save
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { AssignmentRow, CourseType } from './types';
import { MASTER_DB, ALL_ROOMS, MAIN_GROUPS, DAYS, SEMESTERS } from './constants';

// Helper pour les statistiques
const AssignmentRowService = {
    getTeacherStats: (assignmentRows: AssignmentRow[], schedule: Record<string, string | null>, semesterFilter?: string) => {
        const stats: Record<string, { cm: number, td: number, tp: number, total: string }> = {};

        Object.values(schedule).forEach(courseId => {
            if (!courseId) return;
            const row = assignmentRows.find(r => r.id === courseId);
            if (!row) return;
            if (semesterFilter && row.semester !== semesterFilter) return;

            const teacher = row.teacher || 'Non assigné';
            if (!stats[teacher]) {
                stats[teacher] = { cm: 0, td: 0, tp: 0, total: '0' };
            }

            if (row.type === 'CM') stats[teacher].cm++;
            else if (row.type === 'TD') stats[teacher].td++;
            else if (row.type === 'TP') stats[teacher].tp++;
        });

        // Calculer l'équivalent CM : CM + (TD + TP) * 2/3
        Object.values(stats).forEach(stat => {
            const eqCm = stat.cm + ((stat.td + stat.tp) * 2 / 3);
            stat.total = eqCm.toFixed(1); // Garder 1 décimale
        });

        return stats;
    }
};

export default function App() {
    const [isClient, setIsClient] = useState(false);
    const [semester, setSemester] = useState<string>('S1');
    const [activeTab, setActiveTab] = useState<'manage' | 'planning' | 'config' | 'data'>('planning');
    const [activeMainGroup, setActiveMainGroup] = useState("Groupe 1");
    const [currentWeek, setCurrentWeek] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);
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
    const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le re-rendu des listes
    const [dataProgressViewMode, setDataProgressViewMode] = useState<'subjects' | 'teachers'>('subjects');

    // Données modifiables (initialisées depuis les constantes)
    const [customRooms, setCustomRooms] = useState<string[]>([...ALL_ROOMS]);
    const [customSubjects, setCustomSubjects] = useState(() => {
        // Convertir la structure existante pour séparer CM et TD/TP
        const converted = JSON.parse(JSON.stringify(MASTER_DB)).map((semester: any) => ({
            ...semester,
            matieres: semester.matieres.map((matiere: any) => ({
                ...matiere,
                enseignantsCM: matiere.enseignantsCM || matiere.enseignants, // Utiliser la valeur persistée ou le fallback
                enseignantsTD: matiere.enseignantsTD || matiere.enseignants  // Utiliser la valeur persistée ou le fallback
            }))
        }));
        return converted;
    });

    // Configuration
    const [config, setConfig] = useState({
        startDate: '2024-09-02',
        totalWeeks: 16,
        numberOfGroups: 4,
        vacationPeriods: [] as Array<{ startDate: string, endDate: string }>, // Périodes de vacances
        timeSlots: ['08:00-09:30', '09:45-11:15', '11:30-13:00', '14:00-15:30', '15:45-17:15']
    });

    // Initialisation côté client
    useEffect(() => {
        setIsClient(true);
        // Charger la configuration depuis localStorage
        const savedConfig = localStorage.getItem('supnum_config_v67');
        if (savedConfig) {
            try {
                setConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error('Erreur lors du chargement de la configuration:', e);
            }
        }

        // Charger les données personnalisées depuis localStorage
        const savedRooms = localStorage.getItem('supnum_custom_rooms');
        if (savedRooms) {
            try {
                setCustomRooms(JSON.parse(savedRooms));
            } catch (e) {
                console.error('Erreur lors du chargement des salles:', e);
            }
        }

        const savedSubjects = localStorage.getItem('supnum_custom_subjects');
        if (savedSubjects) {
            try {
                const parsedSubjects = JSON.parse(savedSubjects);
                // MIGRATION: Assurer que les champs enseignantsCM et enseignantsTD existent
                parsedSubjects.forEach((sem: any) => {
                    sem.matieres.forEach((mat: any) => {
                        if (mat.enseignantsCM === undefined) mat.enseignantsCM = mat.enseignants || '';
                        if (mat.enseignantsTD === undefined) mat.enseignantsTD = mat.enseignants || '';
                    });
                });
                setCustomSubjects(parsedSubjects);
            } catch (e) {
                console.error('Erreur lors du chargement des matières:', e);
            }
        }

        // Charger les assignmentRows sauvegardés
        const savedAssignmentRows = localStorage.getItem('supnum_assignment_rows');
        if (savedAssignmentRows) {
            try {
                setAssignmentRows(JSON.parse(savedAssignmentRows));
            } catch (e) {
                console.error('Erreur lors du chargement des cours:', e);
            }
        }

        // Charger le planning sauvegardé
        const savedSchedule = localStorage.getItem('supnum_schedule');
        if (savedSchedule) {
            try {
                const loadedAndMigrated = JSON.parse(savedSchedule);
                // Migration V1 -> V2 (string -> string[]) - garder le format compatible
                const migrated: Record<string, string | null | string[]> = {};
                Object.keys(loadedAndMigrated).forEach(key => {
                    const val = loadedAndMigrated[key];
                    if (typeof val === 'string') {
                        migrated[key] = val; // Garder le format string pour compatibilité
                    } else if (Array.isArray(val)) {
                        migrated[key] = val; // Support du format array
                    } else if (val === null) {
                        migrated[key] = null;
                    }
                });
                setSchedule(migrated as Record<string, string | null>);
            } catch (e) {
                console.error('Erreur lors du chargement du planning:', e);
            }
        }

        // Charger les données initiales seulement si pas de sauvegarde d'assignmentRows
        if (!savedAssignmentRows) {
            const newRows: AssignmentRow[] = [];
            const subjectsToUse = savedSubjects ? JSON.parse(savedSubjects) : customSubjects;
            subjectsToUse.forEach((semData: any) => {
                semData.matieres.forEach((matiere: any) => {
                    // Utiliser un nombre fixe de groupes pour l'instant
                    const groups = ["Groupe 1", "Groupe 2", "Groupe 3", "Groupe 4"];
                    groups.forEach(group => {
                        // Utiliser les enseignants CM pour les cours CM
                        const teachersCM = matiere.enseignantsCM || matiere.enseignants || '';
                        // Utiliser les enseignants TD pour les cours TD
                        const teachersTD = matiere.enseignantsTD || matiere.enseignants || '';

                        let defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";

                        // Ligne CM pour chaque matière/groupe
                        newRows.push({
                            id: Math.random().toString(36).substr(2, 9),
                            subject: matiere.code,
                            subjectLabel: matiere.libelle,
                            type: 'CM',
                            mainGroup: group,
                            sharedGroups: [group],
                            subLabel: 'CM',
                            teacher: teachersCM.split('/')[0]?.trim() || '', // Prendre seulement le premier enseignant
                            room: 'Amphi A',
                            semester: semData.semestre
                        });

                        // Ligne TD pour chaque matière/groupe
                        newRows.push({
                            id: Math.random().toString(36).substr(2, 9),
                            subject: matiere.code,
                            subjectLabel: matiere.libelle,
                            type: 'TD',
                            mainGroup: group,
                            sharedGroups: [group],
                            subLabel: 'TD',
                            teacher: teachersTD.split('/')[0]?.trim() || '', // Prendre seulement le premier enseignant
                            room: defaultRoom,
                            semester: semData.semestre
                        });
                    });
                });
            });
            setAssignmentRows(newRows);
        }

        if (!savedSchedule) {
            setSchedule({});
        }
    }, []);

    const UNIQUE_TEACHERS = useMemo(() => {
        const set = new Set<string>();
        customSubjects.forEach((sem: any) =>
            sem.matieres.forEach((m: any) => {
                // Ajouter les enseignants CM
                if (m.enseignantsCM) {
                    m.enseignantsCM.split('/').forEach((t: any) => {
                        if (t.trim()) set.add(t.trim());
                    });
                }
                // Ajouter les enseignants TD
                if (m.enseignantsTD) {
                    m.enseignantsTD.split('/').forEach((t: any) => {
                        if (t.trim()) set.add(t.trim());
                    });
                }
                // Fallback vers l'ancien champ pour compatibilité
                if (m.enseignants && !m.enseignantsCM && !m.enseignantsTD) {
                    m.enseignants.split('/').forEach((t: any) => {
                        if (t.trim()) set.add(t.trim());
                    });
                }
            })
        );
        return Array.from(set).sort();
    }, [customSubjects]);

    const SUBJECT_NAMES: Record<string, string> = useMemo(() => {
        const names: Record<string, string> = {};
        customSubjects.forEach((sem: any) => sem.matieres.forEach((m: any) => { names[m.code] = m.libelle; }));
        return names;
    }, [customSubjects]);

    // Génération dynamique des groupes basée sur la configuration
    const dynamicGroups = useMemo(() => {
        return Array.from({ length: config.numberOfGroups }, (_, i) => `Groupe ${i + 1}`);
    }, [config.numberOfGroups]);

    const loadFullDataset = (confirmAction = true) => {
        if (confirmAction && !confirm("Réinitialiser ?")) return;
        const newRows: AssignmentRow[] = [];

        customSubjects.forEach((semData: any) => {
            semData.matieres.forEach((matiere: any) => {
                dynamicGroups.forEach(group => {
                    // Utiliser les enseignants CM pour les cours CM
                    const teachersCM = matiere.enseignantsCM || matiere.enseignants || '';
                    // Utiliser les enseignants TD pour les cours TD
                    const teachersTD = matiere.enseignantsTD || matiere.enseignants || '';

                    let defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";

                    // Ligne CM pour chaque matière/groupe
                    newRows.push({
                        id: Math.random().toString(36).substr(2, 9),
                        subject: matiere.code,
                        subjectLabel: matiere.libelle,
                        type: 'CM',
                        mainGroup: group,
                        sharedGroups: [group],
                        subLabel: 'CM',
                        teacher: teachersCM.split('/')[0]?.trim() || '', // Prendre seulement le premier enseignant
                        room: 'Amphi A',
                        semester: semData.semestre
                    });

                    // Ligne TD pour chaque matière/groupe
                    newRows.push({
                        id: Math.random().toString(36).substr(2, 9),
                        subject: matiere.code,
                        subjectLabel: matiere.libelle,
                        type: 'TD',
                        mainGroup: group,
                        sharedGroups: [group],
                        subLabel: 'TD',
                        teacher: teachersTD.split('/')[0]?.trim() || '', // Prendre seulement le premier enseignant
                        room: defaultRoom,
                        semester: semData.semestre
                    });
                });
            });
        });

        setAssignmentRows(newRows);
        setSchedule({});
    };



    // Fonction pour vérifier si une date est en période de vacances
    const isDateInVacation = (date: Date, vacationPeriods: Array<{ startDate: string, endDate: string }>) => {
        return vacationPeriods.some(period => {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            return date >= start && date <= end;
        });
    };

    // Calcul des dates de la semaine (en excluant les vacances)
    const weekDates = useMemo(() => {
        const startDate = new Date(config.startDate);
        const vacationPeriods = config.vacationPeriods || [];

        // Trouver la vraie semaine de cours (en excluant les vacances)
        let actualWeekCount = 0;
        let currentDate = new Date(startDate);

        // Compter les semaines jusqu'à atteindre la semaine de cours désirée
        while (actualWeekCount < currentWeek) {
            // Vérifier si cette semaine est en vacances
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekStart.getDate() + 6);

            // Si la semaine n'est pas entièrement en vacances, on la compte
            let isWeekInVacation = true;
            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                if (!isDateInVacation(d, vacationPeriods)) {
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
        weekEnd.setDate(currentDate.getDate() + 4); // Vendredi

        return {
            startStr: currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            endStr: weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
    }, [config.startDate, config.vacationPeriods, currentWeek]);

    // Détection des conflits (visuels, pour l'affichage en rouge)
    const conflicts = useMemo(() => {
        const conflictSet = new Set<string>();

        // 1. Conflits locaux (2 cours sur le même slot dans le même groupe)
        const timeSlotMap: Record<string, string[]> = {};
        Object.entries(schedule).forEach(([key, courseId]) => {
            if (courseId) {
                const [sem, week, group, day, time] = key.split('|');
                if (sem !== semester || week !== `w${currentWeek}` || group !== activeMainGroup) return;

                const slotKey = `${day}|${time}`;
                if (!timeSlotMap[slotKey]) timeSlotMap[slotKey] = [];
                timeSlotMap[slotKey].push(courseId as string);
            }
        });

        Object.values(timeSlotMap).forEach(courseIds => {
            if (courseIds.length > 1) {
                courseIds.forEach(id => conflictSet.add(id));
            }
        });

        // 2. Conflits globaux (Salle/Prof pris par un autre groupe)
        Object.entries(schedule).forEach(([key, courseId]) => {
            if (!courseId) return;
            const [sem, week, group, day, time] = key.split('|');

            if (sem !== semester || week !== `w${currentWeek}` || group !== activeMainGroup) return;

            const currentCourse = assignmentRows.find(r => r.id === courseId as string);
            if (!currentCourse) return;

            for (const otherGroup of dynamicGroups) {
                if (otherGroup === activeMainGroup) continue;

                const otherSlotKey = `${semester}|w${currentWeek}|${otherGroup}|${day}|${time}`;
                const otherCourseId = schedule[otherSlotKey];

                if (otherCourseId) {
                    const otherCourse = assignmentRows.find(r => r.id === otherCourseId as string);
                    if (otherCourse) {
                        const isSharedClass = currentCourse.subject === otherCourse.subject &&
                            currentCourse.type === otherCourse.type &&
                            currentCourse.room === otherCourse.room;

                        if (!isSharedClass) {
                            if (currentCourse.room && otherCourse.room &&
                                currentCourse.room !== '?' && otherCourse.room !== '?' &&
                                currentCourse.room !== '' && otherCourse.room !== '' &&
                                currentCourse.room === otherCourse.room) {
                                conflictSet.add(courseId as string);
                            }
                            const currentTeachers = currentCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
                            const otherTeachers = otherCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
                            const commonTeacher = currentTeachers.find(t => otherTeachers.includes(t));
                            if (commonTeacher) {
                                conflictSet.add(courseId as string);
                            }
                        }
                    }
                }
            }
        });

        return conflictSet;
    }, [schedule, semester, currentWeek, activeMainGroup, assignmentRows, dynamicGroups]);

    // Fonction de vérification des conflits
    // Fonction de vérification des conflits
    const checkInstantConflict = (courseId: string, day: string, time: string): string | null => {
        const draggingCourse = assignmentRows.find(r => r.id === courseId);
        if (!draggingCourse) return null;

        // 1. Conflit de créneau dans le groupe actuel (déjà occupé)
        const currentSlotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
        const existingLocalId = schedule[currentSlotKey];
        if (existingLocalId && existingLocalId !== courseId) {
            return "Déjà présent dans ce créneau";
        }

        // 2. Vérifier les conflits globaux
        for (const otherGroup of dynamicGroups) {
            if (otherGroup === activeMainGroup) continue;

            const otherSlotKey = `${semester}|w${currentWeek}|${otherGroup}|${day}|${time}`;
            const otherCourseId = schedule[otherSlotKey];

            if (otherCourseId) {
                const otherCourse = assignmentRows.find(r => r.id === otherCourseId as string);
                if (otherCourse) {
                    const isSharedClass = draggingCourse.subject === otherCourse.subject &&
                        draggingCourse.type === otherCourse.type &&
                        draggingCourse.room === otherCourse.room;

                    if (!isSharedClass) {
                        if (draggingCourse.room && otherCourse.room &&
                            draggingCourse.room !== '?' && otherCourse.room !== '?' &&
                            draggingCourse.room !== '' && otherCourse.room !== '' &&
                            draggingCourse.room === otherCourse.room) {
                            return `CONFLIT SALLE : ${draggingCourse.room} déjà utilisée par ${otherGroup} (${otherCourse.subject})`;
                        }

                        const draggingTeachers = draggingCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
                        const otherTeachers = otherCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');

                        const commonTeacher = draggingTeachers.find(t => otherTeachers.includes(t));
                        if (commonTeacher) {
                            return `CONFLIT ENSEIGNANT : ${commonTeacher} enseigne déjà en ${otherGroup} (${otherCourse.subject})`;
                        }
                    }
                }
            }
        }
        return null;
    };

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

    // Sauvegarde automatique des assignmentRows
    useEffect(() => {
        if (isClient && assignmentRows.length > 0) {
            localStorage.setItem('supnum_assignment_rows', JSON.stringify(assignmentRows));
        }
    }, [assignmentRows, isClient]);

    // Sauvegarde automatique des customSubjects
    useEffect(() => {
        if (isClient && customSubjects.length > 0) {
            localStorage.setItem('supnum_custom_subjects', JSON.stringify(customSubjects));
        }
    }, [customSubjects, isClient]);

    // Sauvegarde automatique du planning
    useEffect(() => {
        if (isClient && Object.keys(schedule).length > 0) {
            localStorage.setItem('supnum_schedule', JSON.stringify(schedule));
        }
    }, [isClient]); // Se déclenche une seule fois au montage du client

    const handleExport = () => {
        const data = {
            config,
            customRooms,
            customSubjects,
            schedule,
            assignmentRows
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supnum_timetable_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.config) setConfig(data.config);
                if (data.customRooms) setCustomRooms(data.customRooms);
                if (data.customSubjects) setCustomSubjects(data.customSubjects);
                if (data.schedule) setSchedule(data.schedule);
                if (data.assignmentRows) setAssignmentRows(data.assignmentRows);

                // Sauvegarder dans localStorage
                localStorage.setItem('supnum_config', JSON.stringify(data.config));
                localStorage.setItem('supnum_custom_rooms', JSON.stringify(data.customRooms));
                localStorage.setItem('supnum_custom_subjects', JSON.stringify(data.customSubjects));
                localStorage.setItem('supnum_schedule', JSON.stringify(data.schedule));
                localStorage.setItem('supnum_assignment_rows', JSON.stringify(data.assignmentRows));

                alert('Importation réussie !');
                window.location.reload();
            } catch (error) {
                console.error('Erreur lors de l\'importation:', error);
                alert('Erreur lors de l\'importation du fichier.');
            }
        };
        reader.readAsText(file);
    };

    // Fonction pour sauvegarder dans constants.ts via l'API
    const saveToConstantsFile = async () => {
        if (!confirm('Voulez-vous vraiment écraser le fichier constants.ts avec les données actuelles (Salles et Matières) ?')) {
            return;
        }

        try {
            const response = await fetch('/api/save-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rooms: customRooms,
                    subjects: customSubjects
                }),
            });

            const result = await response.json();
            if (result.success) {
                alert('Sauvegarde réussie ! Vous devez redémarrer le serveur pour voir les changements persistants.');
            } else {
                alert('Erreur lors de la sauvegarde : ' + result.message);
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur technique lors de la sauvegarde.');
        }
    };

    // Sauvegarde automatique de la configuration
    useEffect(() => {
        if (isClient) {
            localStorage.setItem('supnum_config_v67', JSON.stringify(config));
        }
    }, [config, isClient]);

    // Sauvegarde automatique des salles personnalisées
    useEffect(() => {
        if (isClient && customRooms.length > 0) {
            localStorage.setItem('supnum_custom_rooms', JSON.stringify(customRooms));
        }
    }, [customRooms, isClient]);

    // Masquer automatiquement les messages toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // --- SOUND UTILS ---
    const playConflictSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    // --- HEADER BANNER ---
    const HeaderBanner = ({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {
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
                                {dynamicGroups.map((g: string) => <option key={g} value={g}>{g.replace("Groupe ", "G")}</option>)}
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
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Chercher..." className="w-28 focus:w-40 bg-white border border-slate-300 rounded-full py-1 pl-6 pr-4 text-[12px] font-medium transition-all outline-none" />
                        </div>
                        <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1.5 shadow-sm transition-all" title="Exporter PDF"><FileDown size={14} /></button>
                        <button onClick={() => {
                            console.log('Debug info:', {
                                assignmentRowsLength: assignmentRows.length,
                                dynamicGroupsLength: dynamicGroups.length,
                                isClient,
                                semester,
                                activeMainGroup
                            });
                            loadFullDataset(false);
                        }} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded p-1.5 shadow-sm transition-all" title="Debug">🐛</button>
                    </div>
                </div>
            </div>
        );
    }


    const handleExportPDF = async () => {
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
        } catch (err) { alert("Erreur export PDF"); } finally { setIsExporting(false); }
    };

    const handleDragEnd = (e: DragEndEvent) => {
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
            playConflictSound();
            setToastMessage({ msg: conflictMsg, type: 'error' });
            return; // Annuler le placement en cas de conflit
        }

        // Vérifier si Ctrl est pressé pour copier au lieu de déplacer
        const isCtrlPressed = (e as any).activatorEvent?.ctrlKey || (e as any).activatorEvent?.metaKey;

        if (isCtrlPressed) {
            // Créer une copie du cours
            const newCourse: AssignmentRow = {
                ...originalCourse,
                id: Math.random().toString(36).substr(2, 9), // Nouvel ID unique
            };

            // Ajouter la nouvelle carte aux assignmentRows
            setAssignmentRows(prev => [...prev, newCourse]);

            // Placer la copie dans le planning
            setSchedule(prev => ({
                ...prev,
                [`${semester}|w${currentWeek}|${activeMainGroup}|${targetTimeSlot}`]: newCourse.id
            }));

            setToastMessage({ msg: `Copie de ${originalCourse.subject} créée`, type: 'success' });
        } else {
            // Comportement normal : déplacer la carte
            setSchedule(prev => {
                const next = { ...prev as Record<string, string | null> };
                Object.keys(next).forEach(k => { if (k.startsWith(`${semester}|w${currentWeek}|${activeMainGroup}|`) && next[k] === sourceId) next[k] = null; });
                next[`${semester}|w${currentWeek}|${activeMainGroup}|${targetTimeSlot}`] = sourceId;
                return next;
            });
        }
    };

    const handleUnassign = (courseId: string) => {
        setSchedule(prev => {
            const next = { ...prev as Record<string, string | null> };
            Object.keys(next).forEach(k => { if (next[k] === courseId) next[k] = null; });
            return next;
        });
    };

    const updateRow = (id: string, field: keyof AssignmentRow, value: any) => {
        setAssignmentRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, ...(field === 'mainGroup' ? { sharedGroups: [value] } : {}) } : r));
    };

    const handleResourceChange = (rowId: string, index: number, field: 'teacher' | 'room', value: string) => {
        setAssignmentRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const tArr = r.teacher.split('/');
            const rArr = (r.room || '').split('/');
            while (tArr.length <= index) tArr.push("?");
            while (rArr.length <= index) rArr.push("?");
            if (field === 'teacher') tArr[index] = value;
            if (field === 'room') rArr[index] = value;
            return { ...r, teacher: tArr.join('/'), room: rArr.join('/') };
        }));
    };

    if (!isClient) return null;

    const groupCourses = assignmentRows.filter(r => r.mainGroup === activeMainGroup && r.semester === semester);
    const placedIdsThisWeek = Object.keys(schedule)
        .filter(k => k.startsWith(`${semester}|w${currentWeek}|${activeMainGroup}|`) && schedule[k])
        .map(k => schedule[k] as string);
    const sidebarCourses = groupCourses.filter(c => !placedIdsThisWeek.includes(c.id));

    const gridTemplate = `40px repeat(${config.timeSlots.length}, minmax(0, 1fr))`;
    const gridBaseClasses = "grid w-full";

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden relative" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
            {toastMessage && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999]">
                    <div className={`px-4 py-2 rounded-lg shadow-xl font-bold text-white flex items-center gap-2 ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <AlertTriangle size={18} />
                        <span className="text-xs">{toastMessage.msg}</span>
                        <button onClick={() => setToastMessage(null)}><X size={14} /></button>
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
                    <button onClick={() => setActiveTab('planning')} className={`p-2 rounded-xl transition-colors ${activeTab === 'planning' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Planning"><Calendar size={20} /></button>
                    <button onClick={() => setActiveTab('manage')} className={`p-2 rounded-xl transition-colors ${activeTab === 'manage' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Gestion"><LayoutDashboard size={20} /></button>

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
                            <Database size={20} />
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

                    <button onClick={() => setActiveTab('config')} className={`p-2 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Configuration"><Settings size={20} /></button>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 h-full">
                    {activeTab === 'planning' && (
                        <DndContext onDragStart={(e) => setActiveDragItem(assignmentRows.find(r => r.id === e.active.id) || null)} onDragEnd={handleDragEnd}>
                            <div className="flex flex-1 overflow-hidden h-full">
                                <div className="w-48 bg-white border-r border-slate-200 flex flex-col shrink-0 p-2">
                                    <div className="px-3 py-2 border-b text-[12px] font-bold text-slate-700 uppercase text-left bg-white">À Placer <span className="text-sm text-slate-400">({sidebarCourses.length})</span></div>

                                    {/* Aide pour Ctrl+Drag */}
                                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                                        <div className="flex items-center gap-2 text-[10px] text-blue-700">
                                            <span className="font-bold">💡</span>
                                            <span className="font-medium">Maintenez <kbd className="px-1 py-0.5 bg-blue-200 rounded text-[9px] font-bold">Ctrl</kbd> + glisser pour copier une carte</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                        {sidebarCourses.map(c => <DraggableCard key={`${c.id}-${refreshKey}`} course={c} searchQuery={searchQuery} compact customSubjects={customSubjects} schedule={schedule} assignmentRows={assignmentRows} />)}
                                    </div>
                                </div>

                                <div className="flex-1 p-2 bg-slate-200 overflow-hidden flex flex-col min-h-0">
                                    <div id="calendar-capture-zone" className="flex-1 bg-white rounded-lg shadow border border-slate-300 overflow-auto flex flex-col min-h-0">
                                        <div style={{ gridTemplateColumns: gridTemplate }} className={`${gridBaseClasses} border-b border-slate-200 bg-slate-50 sticky top-0 z-20`}>
                                            <div className="p-2 border-r text-center text-[10px] font-bold text-slate-400">H</div>
                                            {config.timeSlots.map(t => <div key={t} className="p-2 border-r last:border-0 text-center text-[10px] font-black text-slate-700 uppercase">{t}</div>)}
                                        </div>

                                        <div className="flex-1 overflow-auto bg-slate-50/30 space-y-1 min-h-0">
                                            {DAYS.map(day => (
                                                <div key={day} style={{ gridTemplateColumns: gridTemplate }} className={`${gridBaseClasses} w-full border-b border-slate-200 bg-white items-start overflow-visible min-h-0`}>
                                                    <div className="border-r border-slate-200 bg-slate-100 flex items-center justify-center py-1 self-start overflow-visible min-h-[44px]">
                                                        <span className="inline-block font-black text-slate-900 text-[11px] -rotate-90 uppercase tracking-widest leading-none whitespace-nowrap">{day}</span>
                                                    </div>
                                                    {config.timeSlots.map(time => {
                                                        const slotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
                                                        const courseId = schedule[slotKey];
                                                        const course = courseId ? assignmentRows.find(c => c.id === courseId) : null;
                                                        return (
                                                            <div key={time} className="p-1 border-r last:border-0 relative">
                                                                <DroppableSlot id={`${day}|${time}`}>
                                                                    {course && <CourseBadge key={`${course.id}-${refreshKey}`} course={course} hasConflict={conflicts.has(course.id)} searchQuery={searchQuery} onUnassign={() => handleUnassign(course.id)} customSubjects={customSubjects} schedule={schedule} assignmentRows={assignmentRows} />}
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
                                {activeDragItem ? <div className="opacity-90 w-36 shadow-2xl rotate-1"><DraggableCard course={activeDragItem} compact customSubjects={customSubjects} schedule={schedule} assignmentRows={assignmentRows} /></div> : null}
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
                                    {/* Buttons removed as requested */}
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
                                                        <span className="text-[11px] uppercase tracking-wide whitespace-nowrap">{row.mainGroup.replace("Groupe ", "G")}</span>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50 truncate">
                                                        <div className="flex flex-col truncate">
                                                            <span className="font-bold text-green-900 text-[12px] truncate leading-tight mb-0.5">{row.subject}</span>
                                                            <span className="text-[10px] text-slate-400 italic truncate leading-tight">{SUBJECT_NAMES[row.subject] || row.subjectLabel}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50 text-center px-1">
                                                        <select value={row.type} onChange={(e) => updateRow(row.id, 'type', e.target.value as CourseType)} className={`font-black rounded px-1 py-0.5 text-[11px] w-full ${getCourseColor(row.type).badge} text-white shadow-sm outline-none cursor-pointer text-center`}>
                                                            <option value="CM">CM</option><option value="TD">TD</option><option value="TP">TP</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-1 border-r border-slate-50">
                                                        <div className="flex gap-2 items-center">
                                                            {/* Sélecteur d'enseignant */}
                                                            <select
                                                                key={`teacher-select-${row.id}-${refreshKey}`}
                                                                value={row.type === 'CM' ?
                                                                    (row.teacher.split('/')[0]?.trim() || "") :
                                                                    (row.teacher || "")
                                                                }
                                                                onChange={(e) => {
                                                                    if (row.type === 'CM') {
                                                                        // Pour CM : remplacer l'enseignant
                                                                        setAssignmentRows(prev => prev.map(r =>
                                                                            r.id === row.id ? { ...r, teacher: e.target.value } : r
                                                                        ));
                                                                    } else {
                                                                        // Pour TD/TP : ajouter l'enseignant s'il n'existe pas déjà
                                                                        const currentTeachers = (row.teacher || '').split('/').map(t => t.trim()).filter(t => t && t !== '?');
                                                                        if (!currentTeachers.includes(e.target.value) && e.target.value) {
                                                                            const newTeacher = currentTeachers.length > 0 ?
                                                                                currentTeachers.join('/') + '/' + e.target.value :
                                                                                e.target.value;
                                                                            setAssignmentRows(prev => prev.map(r =>
                                                                                r.id === row.id ? { ...r, teacher: newTeacher } : r
                                                                            ));
                                                                        } else if (e.target.value) {
                                                                            // Si l'enseignant existe déjà, juste le sélectionner
                                                                            setAssignmentRows(prev => prev.map(r =>
                                                                                r.id === row.id ? { ...r, teacher: e.target.value } : r
                                                                            ));
                                                                        }
                                                                    }
                                                                    setRefreshKey(prev => prev + 1); // Forcer le re-rendu des cartes
                                                                }}
                                                                className="flex-1 border border-slate-200 rounded px-2 py-1 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-green-300 shadow-sm"
                                                            >
                                                                <option value="">Enseignant...</option>
                                                                {/* Enseignants affectés à cette matière */}
                                                                {(() => {
                                                                    const semesterData = customSubjects.find(s => s.semestre === row.semester);
                                                                    const matiereData = semesterData?.matieres.find(m => m.code === row.subject);

                                                                    // Utiliser les enseignants appropriés selon le type de cours
                                                                    let assignedTeachers: string[] = [];
                                                                    if (row.type === 'CM') {
                                                                        assignedTeachers = (matiereData?.enseignantsCM || matiereData?.enseignants || '').split('/').map(t => t.trim()).filter(t => t && t !== '?');
                                                                    } else {
                                                                        assignedTeachers = (matiereData?.enseignantsTD || matiereData?.enseignants || '').split('/').map(t => t.trim()).filter(t => t && t !== '?');
                                                                    }

                                                                    // Utiliser refreshKey pour forcer la mise à jour
                                                                    return assignedTeachers.map((teacher, tIdx) => (
                                                                        <option key={`teacher-${tIdx}-${refreshKey}`} value={teacher}>{teacher}</option>
                                                                    ));
                                                                })()}
                                                            </select>

                                                            {/* Bouton pour ajouter un enseignant à cette matière */}
                                                            <button
                                                                onClick={() => {
                                                                    const newTeacher = prompt('Nom du nouvel enseignant:');
                                                                    if (newTeacher && newTeacher.trim()) {
                                                                        const teacherName = newTeacher.trim();

                                                                        // Mettre à jour customSubjects pour ajouter l'enseignant à cette matière
                                                                        setCustomSubjects(prev => {
                                                                            const newSubjects = [...prev];
                                                                            const semesterIndex = newSubjects.findIndex(s => s.semestre === row.semester);
                                                                            if (semesterIndex !== -1) {
                                                                                const matiereIndex = newSubjects[semesterIndex].matieres.findIndex(m => m.code === row.subject);
                                                                                if (matiereIndex !== -1) {
                                                                                    // Ajouter l'enseignant au bon champ selon le type de cours
                                                                                    if (row.type === 'CM') {
                                                                                        const currentTeachers = newSubjects[semesterIndex].matieres[matiereIndex].enseignantsCM || newSubjects[semesterIndex].matieres[matiereIndex].enseignants || '';
                                                                                        if (!currentTeachers.includes(teacherName)) {
                                                                                            newSubjects[semesterIndex].matieres[matiereIndex].enseignantsCM = currentTeachers ? currentTeachers + '/' + teacherName : teacherName;
                                                                                        }
                                                                                    } else {
                                                                                        const currentTeachers = newSubjects[semesterIndex].matieres[matiereIndex].enseignantsTD || newSubjects[semesterIndex].matieres[matiereIndex].enseignants || '';
                                                                                        if (!currentTeachers.includes(teacherName)) {
                                                                                            newSubjects[semesterIndex].matieres[matiereIndex].enseignantsTD = currentTeachers ? currentTeachers + '/' + teacherName : teacherName;
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            return newSubjects;
                                                                        });

                                                                        // Forcer le re-rendu pour mettre à jour les listes déroulantes
                                                                        setRefreshKey(prev => prev + 1);

                                                                        setToastMessage({ msg: `Enseignant "${teacherName}" ajouté à ${row.subject} (${row.type})`, type: 'success' });
                                                                    }
                                                                }}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                title={`Ajouter un enseignant ${row.type}`}
                                                            >
                                                                +
                                                            </button>

                                                            {/* Sélecteur de salle */}
                                                            <select
                                                                value={row.room || ""}
                                                                onChange={(e) => {
                                                                    setAssignmentRows(prev => prev.map(r =>
                                                                        r.id === row.id ? { ...r, room: e.target.value } : r
                                                                    ));
                                                                    setRefreshKey(prev => prev + 1); // Forcer le re-rendu des cartes
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
                                                        <div className="flex gap-1 justify-center">
                                                            <button
                                                                onClick={() => {
                                                                    const newRow: AssignmentRow = {
                                                                        id: 'new-' + Date.now(),
                                                                        subject: row.subject,
                                                                        subjectLabel: row.subjectLabel,
                                                                        type: row.type === 'CM' ? 'TD' : 'CM',
                                                                        mainGroup: row.mainGroup,
                                                                        sharedGroups: [row.mainGroup],
                                                                        subLabel: row.type === 'CM' ? 'TD' : 'CM',
                                                                        teacher: row.teacher,
                                                                        room: '101',
                                                                        semester: row.semester
                                                                    };
                                                                    setAssignmentRows(prev => [...prev, newRow]);
                                                                    setToastMessage({ msg: `Nouvelle ligne ${newRow.type} ajoutée pour ${row.subject}`, type: 'success' });
                                                                }}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-all shadow-sm"
                                                                title="Ajouter une ligne"
                                                            >
                                                                +
                                                            </button>
                                                            <button onClick={() => { if (confirm('Supprimer ce cours ?')) setAssignmentRows(prev => prev.filter(r => r.id !== row.id)) }} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all shadow-sm" title="Supprimer ce cours">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
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
                                            <Plus size={16} className="mr-2" />
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
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gestion des Matières */}
                            {dataSubTab === 'subjects' && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    {/* Section Gestion des Données (Déplacé ici) */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                                        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase flex items-center gap-2"><Database size={16} /> Sauvegarde et Restauration</h3>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={handleExport}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs rounded font-bold transition-colors flex items-center gap-1.5"
                                            >
                                                <Download size={14} />
                                                Backup JSON
                                            </button>
                                            <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs rounded font-bold transition-colors cursor-pointer flex items-center gap-1.5">
                                                <Upload size={14} />
                                                Restaurer
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImport}
                                                    className="hidden"
                                                />
                                            </label>

                                            <div className="border-l border-slate-300 mx-1"></div>

                                            <button
                                                onClick={saveToConstantsFile}
                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs rounded font-bold transition-colors flex items-center gap-1.5"
                                                title="Écrase le fichier source constants.ts"
                                            >
                                                <Save size={14} />
                                                Sauvegarder dans le fichier (Permanent)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-700">Gestion des Matières</h3>
                                        <div className="flex gap-3 items-center">
                                            {/* Filtre par semestre */}
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

                                            {/* Filtre par matière */}
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
                                            .filter(semestre => !dataFilterSemester || semestre.semestre === dataFilterSemester)
                                            .map((semestre, semIdx) => (
                                                <div key={semIdx} className="border border-slate-100 rounded-lg p-4 bg-slate-50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h4 className="font-bold text-lg text-blue-700">{semestre.semestre}</h4>
                                                        <button onClick={() => {
                                                            const newSubjects = [...customSubjects];
                                                            const newMatiere = {
                                                                code: `NEW${Date.now()}`,
                                                                libelle: 'Nouvelle Matière',
                                                                enseignants: 'Nouvel Enseignant',
                                                                enseignantsCM: 'Nouvel Enseignant',
                                                                enseignantsTD: 'Nouvel Enseignant',
                                                                credit: 3
                                                            };
                                                            newSubjects[semIdx].matieres.push(newMatiere);
                                                            setCustomSubjects(newSubjects);

                                                            // Créer automatiquement les cartes pour tous les groupes
                                                            const newCourses: AssignmentRow[] = [];
                                                            dynamicGroups.forEach(group => {
                                                                // Cours CM
                                                                newCourses.push({
                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                    subject: newMatiere.code,
                                                                    subjectLabel: newMatiere.libelle,
                                                                    type: 'CM',
                                                                    mainGroup: group,
                                                                    sharedGroups: [group],
                                                                    subLabel: 'CM',
                                                                    teacher: newMatiere.enseignantsCM.split('/')[0]?.trim() || '',
                                                                    room: 'Amphi A',
                                                                    semester: semestre.semestre
                                                                });

                                                                // Cours TD
                                                                const defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";
                                                                newCourses.push({
                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                    subject: newMatiere.code,
                                                                    subjectLabel: newMatiere.libelle,
                                                                    type: 'TD',
                                                                    mainGroup: group,
                                                                    sharedGroups: [group],
                                                                    subLabel: 'TD',
                                                                    teacher: newMatiere.enseignantsTD.split('/')[0]?.trim() || '',
                                                                    room: defaultRoom,
                                                                    semester: semestre.semestre
                                                                });
                                                            });

                                                            // Ajouter les nouveaux cours aux assignmentRows
                                                            setAssignmentRows(prev => [...prev, ...newCourses]);

                                                            setToastMessage({ msg: `Matière "${newMatiere.libelle}" ajoutée avec ${newCourses.length} cours créés`, type: 'success' });
                                                        }} className="flex items-center gap-1 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded transition-colors" title="Ajouter une matière">
                                                            <Plus size={14} />
                                                            Ajouter matière
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {semestre.matieres
                                                            .filter(matiere => !dataFilterSubject ||
                                                                matiere.code.toLowerCase().includes(dataFilterSubject.toLowerCase()) ||
                                                                matiere.libelle.toLowerCase().includes(dataFilterSubject.toLowerCase())
                                                            )
                                                            .map((matiere, matIdx) => (
                                                                <div key={matIdx} className="bg-white p-4 rounded border shadow-sm">
                                                                    <div className="grid grid-cols-12 gap-3 items-center mb-3">
                                                                        <div className="col-span-2">
                                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code</label>
                                                                            <input
                                                                                type="text"
                                                                                value={matiere.code}
                                                                                onChange={(e) => {
                                                                                    console.log('Modification code:', e.target.value);
                                                                                    const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                    // Trouver les vrais index car le filtrage change l'ordre d'affichage
                                                                                    const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                    if (realSemIdx !== -1) {
                                                                                        const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                                                                        if (realMatIdx !== -1) {
                                                                                            const oldCode = newSubjects[realSemIdx].matieres[realMatIdx].code;
                                                                                            newSubjects[realSemIdx].matieres[realMatIdx].code = e.target.value;
                                                                                            setCustomSubjects(newSubjects);

                                                                                            // FIX: Mettre à jour aussi les cours programmés
                                                                                            const newAssignmentRows = [...assignmentRows];
                                                                                            let hasUpdates = false;
                                                                                            newAssignmentRows.forEach(row => {
                                                                                                if (row.subject === oldCode) {
                                                                                                    row.subject = e.target.value;
                                                                                                    hasUpdates = true;
                                                                                                }
                                                                                            });
                                                                                            if (hasUpdates) {
                                                                                                setAssignmentRows(newAssignmentRows);
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm font-mono font-bold bg-white"
                                                                                placeholder="Code"
                                                                                readOnly={false}
                                                                                disabled={false}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-3">
                                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de la matière</label>
                                                                            <input
                                                                                type="text"
                                                                                value={matiere.libelle}
                                                                                onChange={(e) => {
                                                                                    console.log('Modification libellé:', e.target.value);
                                                                                    const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                    const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                    if (realSemIdx !== -1) {
                                                                                        const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                                                                        if (realMatIdx !== -1) {
                                                                                            newSubjects[realSemIdx].matieres[realMatIdx].libelle = e.target.value;
                                                                                            setCustomSubjects(newSubjects);

                                                                                            // FIX: Mettre à jour aussi les cours programmés
                                                                                            const newAssignmentRows = [...assignmentRows];
                                                                                            let hasUpdates = false;
                                                                                            newAssignmentRows.forEach(row => {
                                                                                                if (row.subject === matiere.code) { // Utiliser le code (qui n'a pas changé ici)
                                                                                                    row.subjectLabel = e.target.value;
                                                                                                    hasUpdates = true;
                                                                                                }
                                                                                            });
                                                                                            if (hasUpdates) {
                                                                                                setAssignmentRows(newAssignmentRows);
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                                                                                placeholder="Nom de la matière"
                                                                                readOnly={false}
                                                                                disabled={false}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-1">
                                                                            <label className="block text-xs font-bold text-purple-600 uppercase mb-1">Crédit</label>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                max="10"
                                                                                value={matiere.credit || 3}
                                                                                onChange={(e) => {
                                                                                    const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                    const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                    if (realSemIdx !== -1) {
                                                                                        const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                                                                        if (realMatIdx !== -1) {
                                                                                            newSubjects[realSemIdx].matieres[realMatIdx].credit = parseInt(e.target.value) || 3;
                                                                                            setCustomSubjects(newSubjects);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full border rounded px-2 py-1 text-sm bg-purple-50 text-center font-bold"
                                                                                placeholder="3"
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Profs CM</label>
                                                                            <input
                                                                                type="text"
                                                                                value={matiere.enseignantsCM || ''}
                                                                                onChange={(e) => {
                                                                                    console.log('Modification enseignants CM:', e.target.value);
                                                                                    const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                    const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                    if (realSemIdx !== -1) {
                                                                                        const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                                                                        if (realMatIdx !== -1) {
                                                                                            newSubjects[realSemIdx].matieres[realMatIdx].enseignantsCM = e.target.value;
                                                                                            setCustomSubjects(newSubjects);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-blue-50"
                                                                                placeholder="Enseignant CM"
                                                                                readOnly={false}
                                                                                disabled={false}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-3">
                                                                            <label className="block text-xs font-bold text-green-600 uppercase mb-1">Profs TD/TP</label>
                                                                            <input
                                                                                type="text"
                                                                                value={matiere.enseignantsTD || ''}
                                                                                onChange={(e) => {
                                                                                    console.log('Modification enseignants TD:', e.target.value);
                                                                                    const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                    const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                    if (realSemIdx !== -1) {
                                                                                        const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                                                                        if (realMatIdx !== -1) {
                                                                                            newSubjects[realSemIdx].matieres[realMatIdx].enseignantsTD = e.target.value;
                                                                                            setCustomSubjects(newSubjects);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-green-50"
                                                                                placeholder="Intervenants TD/TP (séparés par /)"
                                                                                readOnly={false}
                                                                                disabled={false}
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-1 flex justify-center">
                                                                            <button onClick={() => {
                                                                                const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                                                                const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                                                                if (realSemIdx !== -1) {
                                                                                    newSubjects[realSemIdx].matieres = newSubjects[realSemIdx].matieres.filter((m: any) => m.code !== matiere.code);
                                                                                    setCustomSubjects(newSubjects);
                                                                                }
                                                                            }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 italic">
                                                                        Séparez plusieurs enseignants par "/" (ex: "Moussa/Cheikh") • Crédit: nombre d'ECTS de la matière
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Avancement des cours */}
                            {dataSubTab === 'progress' && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-700">Avancement des Cours</h3>
                                        <div className="flex gap-3 items-center">
                                            {/* Selecteur de Vue */}
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setDataProgressViewMode('subjects')}
                                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${dataProgressViewMode === 'subjects' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Par Matière
                                                </button>
                                                <button
                                                    onClick={() => setDataProgressViewMode('teachers')}
                                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${dataProgressViewMode === 'teachers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Par Enseignant
                                                </button>
                                            </div>

                                            {/* Filtre par semestre */}
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

                                            {/* Filtre par groupe (seulement pour la vue matières) */}
                                            {dataProgressViewMode === 'subjects' && (
                                                <select
                                                    value={dataFilterSubject}
                                                    onChange={(e) => setDataFilterSubject(e.target.value)}
                                                    className="border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none focus:ring-2 ring-blue-100"
                                                >
                                                    <option value="">Tous les groupes</option>
                                                    {dynamicGroups.map(group => (
                                                        <option key={group} value={group}>{group}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {dataProgressViewMode === 'subjects' ? (
                                            // VUE PAR MATIÈRE (Existant)
                                            customSubjects
                                                .filter(semestre => !dataFilterSemester || semestre.semestre === dataFilterSemester)
                                                .map((semestre, semIdx) => (
                                                    <div key={semIdx} className="border border-slate-100 rounded-lg p-4 bg-slate-50">
                                                        <h4 className="font-bold text-lg text-blue-700 mb-3">{semestre.semestre}</h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {semestre.matieres.map((matiere, matIdx) => {
                                                                // Calculer l'avancement global de la matière
                                                                const credit = matiere.credit || 3;
                                                                const totalSessions = credit * 8;

                                                                // Calculer les séances réalisées pour tous les groupes et types
                                                                const getProgressForSubject = () => {
                                                                    const groupsToShow = dataFilterSubject ? [dataFilterSubject] : dynamicGroups;

                                                                    return groupsToShow.map(group => {
                                                                        let cmSessions = 0;
                                                                        let tdSessions = 0;
                                                                        let tpSessions = 0;

                                                                        // Compter les séances par type
                                                                        Object.entries(schedule).forEach(([key, courseIds]) => {
                                                                            // Normaliser courseIds en tableau (gérer les cas string | null | string[])
                                                                            const courseIdsArray = Array.isArray(courseIds) ? courseIds : (courseIds ? [courseIds] : []);
                                                                            
                                                                            if (courseIdsArray.length > 0) {
                                                                                courseIdsArray.forEach(courseId => {
                                                                                    const scheduledCourse = assignmentRows.find((row: any) => row.id === courseId);
                                                                                    if (scheduledCourse &&
                                                                                        scheduledCourse.subject === matiere.code &&
                                                                                        scheduledCourse.mainGroup === group &&
                                                                                        scheduledCourse.semester === semestre.semestre) {

                                                                                        if (scheduledCourse.type === 'CM') cmSessions++;
                                                                                        else if (scheduledCourse.type === 'TD') tdSessions++;
                                                                                        else if (scheduledCourse.type === 'TP') tpSessions++;
                                                                                    }
                                                                                });
                                                                            }
                                                                        });

                                                                        const totalRealized = cmSessions + tdSessions + tpSessions;
                                                                        const progressPercent = Math.round((totalRealized / totalSessions) * 100);

                                                                        return {
                                                                            group,
                                                                            cmSessions,
                                                                            tdSessions,
                                                                            tpSessions,
                                                                            totalRealized,
                                                                            totalSessions,
                                                                            progressPercent
                                                                        };
                                                                    });
                                                                };

                                                                const progressData = getProgressForSubject();

                                                                return (
                                                                    <div key={matIdx} className="bg-white p-4 rounded border shadow-sm">
                                                                        <div className="flex justify-between items-start mb-3">
                                                                            <div>
                                                                                <h5 className="font-bold text-sm text-slate-800">{matiere.code}</h5>
                                                                                <p className="text-xs text-slate-600 truncate">{matiere.libelle}</p>
                                                                                <p className="text-xs text-purple-600 font-bold">{credit} crédits • {totalSessions} séances prévues</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            {progressData.map((data, idx) => (
                                                                                <div key={idx} className="border border-slate-100 rounded p-2 bg-slate-50">
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <span className="text-xs font-bold text-slate-700">{data.group.replace("Groupe ", "G")}</span>
                                                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${data.progressPercent >= 100 ? 'bg-green-100 text-green-700' : data.progressPercent >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                                                            {data.progressPercent}%
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="flex justify-between text-xs text-slate-600 mb-2">
                                                                                        <span>CM: {data.cmSessions}</span>
                                                                                        <span>TD: {data.tdSessions}</span>
                                                                                        <span>TP: {data.tpSessions}</span>
                                                                                        <span className="font-bold">Total: {data.totalRealized}/{data.totalSessions}</span>
                                                                                    </div>

                                                                                    {/* Barre de progression */}
                                                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                                                        <div
                                                                                            className={`h-2 rounded-full transition-all ${data.progressPercent >= 100 ? 'bg-green-500' : data.progressPercent >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                                                            style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
                                                                                        ></div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            // VUE PAR ENSEIGNANT (Nouvelle)
                                            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50">
                                                <h4 className="font-bold text-lg text-blue-700 mb-3">
                                                    {dataFilterSemester ? `Avancement par Enseignant (${dataFilterSemester})` : "Avancement par Enseignant (Global)"}
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {Object.entries(
                                                        AssignmentRowService.getTeacherStats(
                                                            assignmentRows,
                                                            schedule,
                                                            dataFilterSemester || undefined
                                                        )
                                                    ).map(([teacher, stats]: any) => (
                                                        <div key={teacher} className="bg-white p-4 rounded border shadow-sm">
                                                            <div className="flex justify-between items-start mb-3 border-b pb-2">
                                                                <div>
                                                                    <h5 className="font-bold text-sm text-slate-800">{teacher}</h5>
                                                                    <p className="text-xs text-slate-500 font-bold uppercase">Total Éq. CM: {stats.total}</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                                <div className="bg-blue-50 p-2 rounded">
                                                                    <div className="text-xs text-blue-600 font-bold uppercase">CM</div>
                                                                    <div className="text-md font-black text-blue-800">{stats.cm}</div>
                                                                </div>
                                                                <div className="bg-green-50 p-2 rounded">
                                                                    <div className="text-xs text-green-600 font-bold uppercase">TD</div>
                                                                    <div className="text-md font-black text-green-800">{stats.td}</div>
                                                                </div>
                                                                <div className="bg-purple-50 p-2 rounded">
                                                                    <div className="text-xs text-purple-600 font-bold uppercase">TP</div>
                                                                    <div className="text-md font-black text-purple-800">{stats.tp}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {Object.keys(AssignmentRowService.getTeacherStats(assignmentRows, schedule, dataFilterSemester || undefined)).length === 0 && (
                                                        <div className="col-span-full text-center py-8 text-slate-400 italic">
                                                            Aucun cours planifié pour les critères sélectionnés.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="p-8 max-w-4xl mx-auto h-full overflow-auto">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3"><Settings className="text-blue-600" size={28} /> Configuration Générale</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Paramètres de Temps</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date de début (Lundi Semaine 1)</label>
                                            <input
                                                type="date"
                                                value={config.startDate || '2024-09-02'}
                                                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre total de semaines</label>
                                            <input
                                                type="number"
                                                value={config.totalWeeks || 16}
                                                onChange={(e) => setConfig({ ...config, totalWeeks: parseInt(e.target.value) || 16 })}
                                                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de groupes</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={config.numberOfGroups || 4}
                                                onChange={(e) => setConfig({ ...config, numberOfGroups: parseInt(e.target.value) || 4 })}
                                                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Périodes de vacances</label>
                                            <div className="space-y-2">
                                                {(config.vacationPeriods || []).map((period, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                                                        <div className="flex items-center gap-1 text-xs text-slate-600">
                                                            <span>Du</span>
                                                            <input
                                                                type="date"
                                                                value={period.startDate || ''}
                                                                onChange={(e) => {
                                                                    const newPeriods = [...(config.vacationPeriods || [])];
                                                                    newPeriods[idx] = { ...newPeriods[idx], startDate: e.target.value };
                                                                    setConfig({ ...config, vacationPeriods: newPeriods });
                                                                }}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                            <span>au</span>
                                                            <input
                                                                type="date"
                                                                value={period.endDate || ''}
                                                                onChange={(e) => {
                                                                    const newPeriods = [...(config.vacationPeriods || [])];
                                                                    newPeriods[idx] = { ...newPeriods[idx], endDate: e.target.value };
                                                                    setConfig({ ...config, vacationPeriods: newPeriods });
                                                                }}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                        </div>
                                                        <button onClick={() => {
                                                            const newPeriods = (config.vacationPeriods || []).filter((_, i) => i !== idx);
                                                            setConfig({ ...config, vacationPeriods: newPeriods });
                                                        }} className="p-1 text-red-400 hover:text-red-600" title="Supprimer">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const newPeriods = [...(config.vacationPeriods || []), { startDate: '', endDate: '' }];
                                                    setConfig({ ...config, vacationPeriods: newPeriods });
                                                }} className="flex items-center gap-1 text-blue-600 text-xs font-bold hover:underline">
                                                    <Plus size={12} /> Ajouter une période de vacances
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Définissez les périodes de vacances à exclure du planning</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-slate-700">Créneaux Horaires</h3>
                                        <button onClick={() => setConfig({ ...config, timeSlots: [...config.timeSlots, '00:00-00:00'] })} className="flex items-center justify-center bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors" title="Ajouter un créneau">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {config.timeSlots.map((slot, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={slot || ''}
                                                    onChange={(e) => {
                                                        const newSlots = [...config.timeSlots];
                                                        newSlots[idx] = e.target.value;
                                                        setConfig({ ...config, timeSlots: newSlots });
                                                    }}
                                                    className="flex-1 border rounded px-2 py-1 text-sm font-mono"
                                                />
                                                <button onClick={() => {
                                                    const newSlots = config.timeSlots.filter((_, i) => i !== idx);
                                                    setConfig({ ...config, timeSlots: newSlots });
                                                }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Section Gestion des Données */}
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Gestion des Données et Sauvegarde</h3>
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        onClick={handleExport}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition-colors flex items-center gap-2"
                                    >
                                        <Download size={18} />
                                        Exporter Backup JSON
                                    </button>
                                    <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded font-bold transition-colors cursor-pointer flex items-center gap-2">
                                        <Upload size={18} />
                                        Importer Backup
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleImport}
                                            className="hidden"
                                        />
                                    </label>

                                    <div className="border-l border-slate-300 mx-2"></div>

                                    <button
                                        onClick={saveToConstantsFile}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold transition-colors flex items-center gap-2"
                                        title="Écrase le fichier source constants.ts"
                                    >
                                        <Save size={18} />
                                        Sauvegarder dans le fichier (Permanent)
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 italic">
                                    "Exporter Backup" crée un fichier .json local. "Sauvegarder dans le fichier" met à jour le code source de l'application (constants.ts) pour que les changements soient effectifs pour tous les utilisateurs au redémarrage.
                                </p>
                            </div>

                            <div className="mt-12 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h4 className="font-bold text-yellow-800 flex items-center gap-2 mb-1"><AlertTriangle size={16} /> Attention</h4>
                                <p className="text-xs text-yellow-700">La modification de la date de début impacte l'affichage des dates dans tous les emplois du temps. Les créneaux horaires modifiés apparaîtront immédiatement sur la grille de planning.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// --- SOUS-COMPOSANTS ---

function DraggableCard({ course, compact, searchQuery, customSubjects, schedule, assignmentRows }: any) {
    // Vérifier la recherche AVANT les hooks
    if (searchQuery && !course.subject.toLowerCase().includes(searchQuery.toLowerCase())) return null;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: course.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const colors = getCourseColor(course.type);
    const compactClasses = compact ? 'p-3 text-[12px]' : 'p-2';
    const labelMaxWidth = compact ? 'max-w-[12rem]' : 'max-w-[12rem]';

    // État pour détecter si Ctrl est pressé
    const [isCtrlPressed, setIsCtrlPressed] = React.useState(false);

    // Écouter les événements clavier
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                setIsCtrlPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey) {
                setIsCtrlPressed(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Calculer les séances réalisées et prévues
    const getSessionsInfo = () => {
        const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
        const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
        const credit = matiereData?.credit || 3;
        const totalSessions = credit * 8; // Nombre total de séances prévues

        // Compter les séances réalisées pour cette matière, ce groupe et ce type
        let realizedSessions = 0;
        if (schedule && assignmentRows) {
            Object.entries(schedule).forEach(([key, courseIds]) => {
                // Normaliser courseIds en tableau (gérer les cas string | null | string[])
                const courseIdsArray = Array.isArray(courseIds) ? courseIds : (courseIds ? [courseIds] : []);
                
                if (courseIdsArray.length > 0) {
                    courseIdsArray.forEach(courseId => {
                        // Trouver le cours correspondant dans assignmentRows
                        const scheduledCourse = assignmentRows.find((row: any) => row.id === courseId);
                        if (scheduledCourse &&
                            scheduledCourse.subject === course.subject &&
                            scheduledCourse.mainGroup === course.mainGroup &&
                            scheduledCourse.type === course.type &&
                            scheduledCourse.semester === course.semester) {
                            realizedSessions++;
                        }
                    });
                }
            });
        }

        return { realized: realizedSessions, total: totalSessions };
    };

    const sessionsInfo = getSessionsInfo();

    if (compact) {
        // Forcer l'affichage d'un seul enseignant pour les CM
        let teacher;
        if (course.type === 'CM') {
            // Pour les CM, toujours prendre seulement le premier enseignant
            teacher = (course.teacher || '').split('/')[0]?.trim() || '';
        } else {
            // Pour TD/TP, afficher tous les enseignants
            teacher = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
        }

        return (
            <div ref={setNodeRef} style={style} {...listeners} {...attributes}
                className={`relative rounded-lg border-2 ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} ${compactClasses} cursor-grab active:cursor-grabbing hover:shadow transition-all shadow-sm ${isDragging && isCtrlPressed ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
                {isDragging && isCtrlPressed && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
                        COPIE
                    </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                    <span className={`text-[7px] font-black px-1 py-0.5 rounded ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {sessionsInfo.realized}/{sessionsInfo.total}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${colors.badge}`}>{course.subLabel || course.type}</span>
                </div>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-900 uppercase truncate" style={{ maxWidth: '7rem' }}>{course.subject}</span>
                        <span className="text-[11px] text-slate-600 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '7rem' }}>
                            {(() => {
                                const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
                                const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
                                return matiereData?.libelle || course.subjectLabel;
                            })()}
                        </span>
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-[10px] font-normal text-red-600 truncate">{teacher}</span>
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`rounded-md border-2 ${colors.border} border-l-4 ${colors.borderLeft} ${colors.bg} ${compactClasses} cursor-grab active:cursor-grabbing hover:shadow-md transition-all mb-2 shadow-sm ${isDragging && isCtrlPressed ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
            {isDragging && isCtrlPressed && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
                    COPIE
                </div>
            )}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-medium text-slate-900 truncate" style={{ maxWidth: '7rem' }}>{course.subject}</span>
                        <span className={`text-[7px] font-black px-1 py-0.5 rounded ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {sessionsInfo.realized}/{sessionsInfo.total}
                        </span>
                    </div>
                    <span className={`text-[8px] font-black px-1 rounded text-white ${colors.badge}`}>{course.subLabel || course.type}</span>
                </div>
                <div className="text-[8px] font-normal text-slate-700 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '10rem' }}>
                    {(() => {
                        const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
                        const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
                        return matiereData?.libelle || course.subjectLabel;
                    })()}
                </div>
                <div className="flex items-center gap-1 mt-1">
                    <Users size={10} className="text-slate-400" />
                    <span className="text-[7px] font-normal text-red-600 truncate" style={{ maxWidth: '8rem' }}>
                        {(() => {
                            // Forcer l'affichage d'un seul enseignant pour les CM
                            let teacherData;
                            if (course.type === 'CM') {
                                // Pour les CM, toujours prendre seulement le premier enseignant
                                teacherData = (course.teacher || '').split('/')[0]?.trim() || '';
                            } else {
                                // Pour TD/TP, afficher tous les enseignants
                                teacherData = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
                            }
                            return teacherData || '?';
                        })()}
                    </span>
                </div>
            </div>
        </div>
    );
}

function DroppableSlot({ id, children }: any) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`w-full min-h-[32px] rounded transition-colors self-start flex flex-col gap-1 ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10' : ''}`}>
            {children}
        </div>
    );
}

function CourseBadge({ course, hasConflict, searchQuery, onUnassign, customSubjects, schedule, assignmentRows }: any) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: course.id });
    const colors = getCourseColor(course.type);
    const style = { opacity: isDragging ? 0.4 : 1 };
    const isMatch = searchQuery && course.subject.toLowerCase().includes(searchQuery.toLowerCase());

    // Calculer les séances réalisées et prévues
    const getSessionsInfo = () => {
        const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
        const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
        const credit = matiereData?.credit || 3;
        const totalSessions = credit * 8; // Nombre total de séances prévues

        // Compter les séances réalisées pour cette matière, ce groupe et ce type
        let realizedSessions = 0;
        if (schedule && assignmentRows) {
            Object.entries(schedule).forEach(([key, courseIds]) => {
                // Normaliser courseIds en tableau (gérer les cas string | null | string[])
                const courseIdsArray = Array.isArray(courseIds) ? courseIds : (courseIds ? [courseIds] : []);
                
                if (courseIdsArray.length > 0) {
                    courseIdsArray.forEach(courseId => {
                        // Trouver le cours correspondant dans assignmentRows
                        const scheduledCourse = assignmentRows.find((row: any) => row.id === courseId);
                        if (scheduledCourse &&
                            scheduledCourse.subject === course.subject &&
                            scheduledCourse.mainGroup === course.mainGroup &&
                            scheduledCourse.type === course.type &&
                            scheduledCourse.semester === course.semester) {
                            realizedSessions++;
                        }
                    });
                }
            });
        }

        return { realized: realizedSessions, total: totalSessions };
    };

    const sessionsInfo = getSessionsInfo();

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} style={style}
            className={`relative w-full rounded border-2 ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} p-1.5 flex flex-col justify-between group shadow-sm hover:shadow transition-all ${hasConflict ? 'bg-red-50 border-red-500 animate-pulse' : ''} ${isMatch ? 'ring-2 ring-pink-500' : ''}`}>
            <button onPointerDown={(e) => { e.stopPropagation(); onUnassign(); }} className="absolute top-1 right-1 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 no-print z-10 bg-white/80 rounded-full p-0.5"><X size={10} /></button>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col pr-2">
                    <div className="flex items-center gap-1">
                        <span title={course.subject} className="font-medium text-[9px] text-slate-950 leading-none truncate" style={{ maxWidth: '6rem' }}>{course.subject}</span>
                        <span className={`text-[7px] font-black px-1 py-0.5 rounded ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {sessionsInfo.realized}/{sessionsInfo.total}
                        </span>
                    </div>
                    <span title={(() => {
                        const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
                        const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
                        return matiereData?.libelle || course.subjectLabel;
                    })()} className="text-[9px] text-slate-700 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '8rem' }}>
                        {(() => {
                            const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
                            const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
                            return matiereData?.libelle || course.subjectLabel;
                        })()}
                    </span>
                </div>
                <span className={`text-[7px] font-black px-1 rounded text-white ${colors.badge}`}>{course.subLabel || course.type}</span>
            </div>
            <div className="flex flex-col gap-0.5 mt-auto">
                {(() => {
                    // Forcer l'affichage d'un seul enseignant pour les CM
                    let teachers, rooms;
                    if (course.type === 'CM') {
                        // Pour les CM, toujours prendre seulement le premier enseignant
                        teachers = (course.teacher || '').split('/')[0]?.trim() || '';
                        rooms = (course.room || '').split('/')[0]?.trim() || '';
                    } else {
                        // Pour TD/TP, afficher tous les enseignants
                        teachers = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
                        rooms = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
                    }

                    return (
                        <div className="flex justify-between items-center bg-white/60 rounded px-1 py-0.5 border border-slate-100/50">
                            <span className="text-[8px] font-normal text-red-600 truncate max-w-[100px]">{teachers || '?'}</span>
                            <span className="text-[8px] font-normal text-blue-800">{rooms || '?'}</span>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

function getCourseColor(type: CourseType) {
    switch (type) {
        case 'CM': return { bg: 'bg-emerald-50', border: 'border-emerald-300', borderLeft: 'border-l-emerald-600', badge: 'bg-emerald-600' };
        case 'TD': return { bg: 'bg-blue-50', border: 'border-blue-300', borderLeft: 'border-l-blue-600', badge: 'bg-blue-600' };
        case 'TP': return { bg: 'bg-orange-50', border: 'border-orange-300', borderLeft: 'border-l-orange-600', badge: 'bg-orange-600' };
        default: return { bg: 'bg-slate-50', border: 'border-slate-300', borderLeft: 'border-l-slate-500', badge: 'bg-slate-500' };
    }
}
