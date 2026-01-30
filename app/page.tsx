"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import {
  LayoutDashboard, Calendar, Settings, X, AlertTriangle, Search, Trash2, Split, Users, Filter, MapPin, Plus, Minus, Database, Download, Upload, Save, LogOut, Printer
} from 'lucide-react';
import { AssignmentRow, CourseType, User } from './types';
import { MASTER_DB, ALL_ROOMS, MAIN_GROUPS, DAYS, SEMESTERS } from './constants';
import LoginScreen from './components/LoginScreen';
import UserManagement from './components/UserManagement';

// Helper pour les statistiques
const AssignmentRowService = {
  getTeacherStats: (assignmentRows: AssignmentRow[], schedule: Record<string, string | null | string[]>, semesterFilter?: string) => {
    const stats: Record<string, { cm: number, td: number, tp: number, total: string }> = {};

    Object.values(schedule).forEach(courseValue => {
      if (!courseValue) return;
      // Normaliser la valeur (gérer les cas string | null | string[])
      const courseIds = Array.isArray(courseValue) ? courseValue : [courseValue];

      courseIds.forEach(courseId => {
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [semester, setSemester] = useState<string>('S1');
  const [activeTab, setActiveTab] = useState<'manage' | 'planning' | 'config' | 'data' | 'users'>('planning');
  const [activeMainGroup, setActiveMainGroup] = useState("Groupe 1");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);
  const [manageFilterCode, setManageFilterCode] = useState<string>("");
  const [compact, setCompact] = useState(true);
  const [cardsSidebarVisible, setCardsSidebarVisible] = useState(true);

  // États pour la gestion des données
  const [dataSubTab, setDataSubTab] = useState<'rooms' | 'subjects' | 'progress'>('subjects');
  const [dataFilterSemester, setDataFilterSemester] = useState<string>("");
  const [dataFilterSubject, setDataFilterSubject] = useState<string>("");
  const [showDataMenu, setShowDataMenu] = useState(false);

  // État principal pour les cours et le planning
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);

  // Fonction pour combiner les cours dans un même créneau
  const getCombinedCourseInfo = (courseIds: string[]) => {
    if (!courseIds || courseIds.length === 0) return null;
    if (courseIds.length === 1) {
      // Un seul cours - retourner tel quel
      const course = assignmentRows.find(r => r.id === courseIds[0]);
      return course ? { ...course, isCombined: false } : null;
    }

    // Plusieurs cours - créer une carte combinée
    const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
    if (courses.length === 0) return null;

    // Combiner les informations avec le format demandé
    const subjects = courses.map(c => c.subject).join('/');
    const teachers = courses.map(c => c.teacher).join('/');
    const rooms = courses.map(c => c.room).join('/');
    const types = courses.map(c => c.type).join('/');

    return {
      id: courseIds.join('_'),
      subject: subjects,
      subjectLabel: courses.map(c => c.subjectLabel).join('/'),
      type: types, // IMPORTANT: utiliser types combinés pour la couleur
      mainGroup: courses[0].mainGroup,
      sharedGroups: courses[0].sharedGroups,
      subLabel: types, // Garder cohérence avec type
      teacher: teachers,
      room: rooms,
      semester: courses[0].semester,
      isCombined: true,
      originalCourses: courses
    };
  };
  const [schedule, setSchedule] = useState<Record<string, string | null | string[]>>({});
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
        setSchedule(migrated as Record<string, string | null | string[]>);
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

    // 1. Conflits locaux (même salle ou même prof dans le même créneau)
    Object.entries(schedule).forEach(([key, courseValue]) => {
      const [sem, week, group, day, time] = key.split('|');
      if (sem !== semester || week !== `w${currentWeek}` || group !== activeMainGroup) return;

      // Normaliser la valeur (gérer les cas string | null | string[])
      const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);

      // Vérifier les conflits entre tous les cours dans ce créneau
      for (let i = 0; i < courseIds.length; i++) {
        const courseId1 = courseIds[i];
        const course1 = assignmentRows.find(r => r.id === courseId1);
        if (!course1) continue;

        for (let j = i + 1; j < courseIds.length; j++) {
          const courseId2 = courseIds[j];
          const course2 = assignmentRows.find(r => r.id === courseId2);
          if (!course2) continue;

          // Vérifier conflit de salle
          if (course1.room && course2.room &&
            course1.room !== '?' && course2.room !== '?' &&
            course1.room !== '' && course2.room !== '' &&
            course1.room === course2.room) {
            conflictSet.add(courseId1);
            conflictSet.add(courseId2);
          }

          // Vérifier conflit de prof
          const teachers1 = course1.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
          const teachers2 = course2.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
          const commonTeacher = teachers1.find(t => teachers2.includes(t));
          if (commonTeacher) {
            conflictSet.add(courseId1);
            conflictSet.add(courseId2);
          }

          // Conflit CM avec tout autre cours pour le même groupe
          if (course1.type === 'CM' || course2.type === 'CM') {
            conflictSet.add(courseId1);
            conflictSet.add(courseId2);
          }
        }
      }
    });

    // 2. Conflits globaux (Salle/Prof pris par un autre groupe)
    Object.entries(schedule).forEach(([key, courseValue]) => {
      const [sem, week, group, day, time] = key.split('|');
      if (sem !== semester || week !== `w${currentWeek}` || group !== activeMainGroup) return;

      // Normaliser la valeur (gérer les cas string | null | string[])
      const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);

      for (const courseId of courseIds) {
        const currentCourse = assignmentRows.find(r => r.id === courseId);
        if (!currentCourse) continue;

        for (const otherGroup of dynamicGroups) {
          if (otherGroup === activeMainGroup) continue;

          const otherSlotKey = `${semester}|w${currentWeek}|${otherGroup}|${day}|${time}`;
          const otherCourseValue = schedule[otherSlotKey];
          // Normaliser la valeur (gérer les cas string | null | string[])
          const otherCourseIds = Array.isArray(otherCourseValue) ? otherCourseValue : (otherCourseValue ? [otherCourseValue] : []);

          for (const otherCourseId of otherCourseIds) {
            const otherCourse = assignmentRows.find(r => r.id === otherCourseId);
            if (!otherCourse) continue;

            const isSharedClass = currentCourse.subject === otherCourse.subject &&
              currentCourse.type === otherCourse.type &&
              currentCourse.room === otherCourse.room;

            if (!isSharedClass) {
              // Vérifier conflit de salle
              if (currentCourse.room && otherCourse.room &&
                currentCourse.room !== '?' && otherCourse.room !== '?' &&
                currentCourse.room !== '' && otherCourse.room !== '' &&
                currentCourse.room === otherCourse.room) {
                conflictSet.add(courseId);
              }
              // Vérifier conflit de prof
              const currentTeachers = currentCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
              const otherTeachers = otherCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
              const commonTeacher = currentTeachers.find(t => otherTeachers.includes(t));
              if (commonTeacher) {
                conflictSet.add(courseId);
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

    // Trouver tous les cours similaires (même matière, même type, même enseignant, même salle, même semestre)
    const similarCourses = assignmentRows.filter(r =>
      r.id !== courseId &&
      r.subject === draggingCourse.subject &&
      r.type === draggingCourse.type &&
      r.teacher === draggingCourse.teacher &&
      r.room === draggingCourse.room &&
      r.semester === draggingCourse.semester
    );

    // Utiliser sharedGroups, ou détecter automatiquement les groupes concernés
    let groupsToCheck: string[] = [];
    if (draggingCourse.sharedGroups && draggingCourse.sharedGroups.length > 0) {
      groupsToCheck = draggingCourse.sharedGroups;
    } else {
      // Si pas de sharedGroups défini, utiliser les groupes des cours similaires + le groupe principal
      const groupsSet = new Set<string>([draggingCourse.mainGroup]);
      similarCourses.forEach(c => groupsSet.add(c.mainGroup));
      groupsToCheck = Array.from(groupsSet);
    }

    // 1. Vérifier les conflits dans le créneau pour tous les groupes concernés
    for (const group of groupsToCheck) {
      const currentSlotKey = `${semester}|w${currentWeek}|${group}|${day}|${time}`;
      const existingLocalValue = schedule[currentSlotKey];
      // Normaliser la valeur (gérer les cas string | null | string[])
      const existingLocalIds = Array.isArray(existingLocalValue) ? existingLocalValue : (existingLocalValue ? [existingLocalValue] : []);

      // Si le cours est déjà dans ce créneau, permettre le déplacement/remplacement
      if (existingLocalIds.includes(courseId as string)) {
        continue; // Pas de conflit si c'est le même cours, passer au groupe suivant
      }

      // Vérifier les conflits avec les autres cours dans le même créneau (même salle ou même prof)
      for (const existingCourseId of existingLocalIds) {
        const existingCourse = assignmentRows.find(r => r.id === existingCourseId);
        if (!existingCourse) continue;

        // Vérifier conflit de salle (même salle non vide)
        if (draggingCourse.room && existingCourse.room &&
          draggingCourse.room !== '?' && existingCourse.room !== '?' &&
          draggingCourse.room !== '' && existingCourse.room !== '' &&
          draggingCourse.room === existingCourse.room) {
          return `CONFLIT SALLE : ${draggingCourse.room} déjà utilisée dans ce créneau (${existingCourse.subject}) - ${group}`;
        }

        // Vérifier conflit de prof (même prof)
        const draggingTeachers = draggingCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
        const existingTeachers = existingCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
        const commonTeacher = draggingTeachers.find(t => existingTeachers.includes(t));
        if (commonTeacher) {
          return `CONFLIT ENSEIGNANT : ${commonTeacher} enseigne déjà dans ce créneau (${existingCourse.subject}) - ${group}`;
        }

        // Interdire un CM en parallèle avec tout autre cours pour le même groupe
        if (draggingCourse.type === 'CM') {
          return `CONFLIT CM : Un cours de CM ne peut pas être en parallèle avec un autre cours pour le même groupe (${existingCourse.subject} ${existingCourse.type} et ${draggingCourse.subject} ${draggingCourse.type})`;
        }
        
        // Interdire tout autre cours en parallèle avec un CM pour le même groupe
        if (existingCourse.type === 'CM') {
          return `CONFLIT CM : Un autre cours ne peut pas être en parallèle avec un CM pour le même groupe (CM ${existingCourse.subject} et ${draggingCourse.type} ${draggingCourse.subject})`;
        }
      }
    }

    // 2. Vérifier les conflits globaux (entre groupes)
    for (const otherGroup of dynamicGroups) {
      // Ne pas vérifier les conflits avec les groupes qui partagent déjà ce cours
      if (groupsToCheck.includes(otherGroup)) continue;

      const otherSlotKey = `${semester}|w${currentWeek}|${otherGroup}|${day}|${time}`;
      const otherCourseValue = schedule[otherSlotKey];
      // Normaliser la valeur (gérer les cas string | null | string[])
      const otherCourseIds = Array.isArray(otherCourseValue) ? otherCourseValue : (otherCourseValue ? [otherCourseValue] : []);

      // Vérifier tous les cours dans le créneau de l'autre groupe
      for (const otherCourseId of otherCourseIds) {
        const otherCourse = assignmentRows.find(r => r.id === otherCourseId as string);
        if (!otherCourse) continue;

        const isSharedClass = draggingCourse.subject === otherCourse.subject &&
          draggingCourse.type === otherCourse.type &&
          draggingCourse.room === otherCourse.room;

        if (!isSharedClass) {
          // Vérifier conflit de salle
          if (draggingCourse.room && otherCourse.room &&
            draggingCourse.room !== '?' && otherCourse.room !== '?' &&
            draggingCourse.room !== '' && otherCourse.room !== '' &&
            draggingCourse.room === otherCourse.room) {
            return `CONFLIT SALLE : ${draggingCourse.room} déjà utilisée par ${otherGroup} (${otherCourse.subject})`;
          }

          // Vérifier conflit de prof
          const draggingTeachers = draggingCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
          const otherTeachers = otherCourse.teacher.split('/').map(t => t.trim()).filter(t => t && t !== '?');
          const commonTeacher = draggingTeachers.find(t => otherTeachers.includes(t));
          if (commonTeacher) {
            return `CONFLIT ENSEIGNANT : ${commonTeacher} enseigne déjà en ${otherGroup} (${otherCourse.subject})`;
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
        alert('Sauvegarde réussie ! La page va se rafraîchir.');
        window.location.reload();
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

  // Charger les données depuis la base quand l'utilisateur se connecte
  useEffect(() => {
    if (currentUser && isClient) {
      loadFromDatabase(currentUser);
    }
  }, [currentUser, isClient]);

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
  const HeaderBanner = ({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, dynamicGroups, config }: any) => {
    return (
      <div className="flex flex-col bg-white shrink-0 shadow-sm z-40 print-header" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
        <div className="flex items-center justify-between w-full h-10 md:h-12 px-3 md:px-6 overflow-hidden" style={{ backgroundColor: '#c4d79b' }}>
          <div className="shrink-0 pr-2 md:pr-4 h-full flex items-center">
            <img src="/rim.png" alt="RIM" className="h-6 md:h-8 w-auto object-contain" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <h1 className="text-sm md:text-base font-semibold text-gray-800 leading-tight tracking-wide">Institut Supérieur du Numérique</h1>
            <h2 className="text-[10px] md:text-[11px] font-medium text-gray-700 uppercase tracking-widest">Emploi du temps</h2>
          </div>
          <div className="shrink-0 pl-2 md:pl-4 h-full flex items-center">
            <img src="/supnum.png" alt="SupNum" className="h-6 md:h-8 w-auto object-contain" />
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
            Du <span className="text-blue-700 font-bold mx-1">{startStr}</span> au <span className="text-blue-700 font-bold mx-1">{endStr}</span>
          </div>
          <div className="flex items-center gap-2 no-export">
            <div className="relative group no-print">
              <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Chercher..." className="w-28 focus:w-40 bg-white border border-slate-300 rounded-full py-1 pl-6 pr-4 text-[12px] font-medium transition-all outline-none" />
            </div>
            <button onClick={() => handleSaveToDatabase()} className={`flex items-center justify-center bg-green-500 hover:bg-green-600 text-white border border-green-600 rounded px-3 py-2 shadow-sm transition-all font-bold text-sm no-print ${currentUser?.role !== 'admin' ? 'hidden' : ''}`} title="Sauvegarder en base de données">
              <Save size={16} className="mr-1" />
              SAVE
            </button>
            <button onClick={() => handlePrint()} className={`flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded px-3 py-2 shadow-sm transition-all font-bold text-sm no-print ${currentUser?.role !== 'admin' ? 'hidden' : ''}`} title="Imprimer le planning">
              <Printer size={16} className="mr-1" />
              PRINT
            </button>
            <button onClick={() => setCurrentUser(null)} className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white border border-red-600 rounded px-3 py-2 shadow-sm transition-all font-bold text-sm no-print" title="Se déconnecter">
              <LogOut size={16} className="mr-1" />
              LOGOUT
            </button>
            <button onClick={() => {
              console.log('Debug info:', {
                assignmentRowsLength: assignmentRows.length,
                dynamicGroupsLength: dynamicGroups.length,
                isClient,
                semester,
                activeMainGroup
              });
              loadFullDataset(false);
            }} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded p-1.5 shadow-sm transition-all no-print" title="Debug">🐛</button>
          </div>
        </div>
      </div>
    );
  }


  // Fonction pour sauvegarder en base de données
  const handleSaveToDatabase = async () => {
    if (!currentUser) {
      setToastMessage({ msg: 'Vous devez être connecté pour sauvegarder', type: 'error' });
      return;
    }

    try {
      // Sauvegarder les assignmentRows
      await fetch('/api/timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.username,
          dataType: 'assignment_rows',
          dataContent: assignmentRows
        }),
      });

      // Sauvegarder le planning
      await fetch('/api/timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.username,
          dataType: 'schedule',
          dataContent: schedule
        }),
      });

      setToastMessage({ msg: 'Données sauvegardées en base avec succès', type: 'success' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setToastMessage({ msg: 'Erreur lors de la sauvegarde en base', type: 'error' });
    }
  };

  // Fonction pour charger les données depuis la base de données
  const loadFromDatabase = async (user: User) => {
    try {
      // Charger toutes les données de l'utilisateur
      const response = await fetch(`/api/timetable/load?userId=${user.username}`);
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;

        // Charger les assignmentRows si disponibles
        if (data.assignment_rows) {
          setAssignmentRows(data.assignment_rows);
        }

        // Charger le planning si disponible
        if (data.schedule) {
          setSchedule(data.schedule);
        }

        console.log('Données chargées depuis la base de données:', data);
        setToastMessage({ msg: `Données chargées depuis ${result.sourceUser === 'admin' ? 'l\'administrateur' : 'votre profil'}`, type: 'success' });
      } else {
        // Si aucune donnée n'est trouvée, charger le dataset par défaut pour les étudiants
        if (user.role === 'student' && assignmentRows.length === 0) {
          loadFullDataset(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement depuis la base:', error);
      // Si erreur et étudiant sans données, charger le dataset par défaut
      if (user.role === 'student' && assignmentRows.length === 0) {
        loadFullDataset(false);
      }
    }
  };

  // Fonction pour imprimer le planning
  const handlePrint = () => {
    window.print();
  };

  const handleUnassignBatch = (courseIds: string[]) => {
    setSchedule(prev => {
      const next = { ...prev as Record<string, string | null | string[]> };
      Object.keys(next).forEach(k => {
        const value = next[k];
        if (Array.isArray(value)) {
          const filtered = value.filter(id => !courseIds.includes(id));
          next[k] = filtered.length > 0 ? filtered : null;
        } else if (courseIds.includes(value as string)) {
          next[k] = null;
        }
      });
      return next;
    });
  };

  const isCourseMatch = (course: any) => {
    if (!searchQuery || !course) return false;
    const q = searchQuery.toLowerCase();
    return (
      (course.subject || '').toLowerCase().includes(q) ||
      (course.teacher || '').toLowerCase().includes(q) ||
      (course.room || '').toLowerCase().includes(q)
    );
  };

  const hasConflict = (day: string, time: string, courseIds: string[]) => {
    return courseIds.some(id => conflicts.has(id));
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

    // Trouver tous les cours similaires (même matière, même type, même enseignant, même salle, même semestre)
    // qui devraient être synchronisés dans le planning
    const similarCourses = assignmentRows.filter(r =>
      r.id !== sourceId &&
      r.subject === originalCourse.subject &&
      r.type === originalCourse.type &&
      r.teacher === originalCourse.teacher &&
      r.room === originalCourse.room &&
      r.semester === originalCourse.semester
    );

    // Utiliser sharedGroups, ou détecter automatiquement les groupes concernés
    let groupsToPlace: string[] = [];
    if (originalCourse.sharedGroups && originalCourse.sharedGroups.length > 0) {
      groupsToPlace = originalCourse.sharedGroups;
    } else {
      // Si pas de sharedGroups défini, utiliser les groupes des cours similaires + le groupe principal
      const groupsSet = new Set<string>([originalCourse.mainGroup]);
      similarCourses.forEach(c => groupsSet.add(c.mainGroup));
      groupsToPlace = Array.from(groupsSet);
    }

    // Vérifier les conflits pour tous les groupes concernés
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

      // Placer la copie dans tous les groupes concernés
      setSchedule(prev => {
        const next = { ...prev as Record<string, string | null | string[]> };
        groupsToPlace.forEach(group => {
          const targetSlotKey = `${semester}|w${currentWeek}|${group}|${targetTimeSlot}`;
          const existingValue = next[targetSlotKey];
          // Normaliser la valeur existante en tableau
          const existingIds = Array.isArray(existingValue) ? existingValue : (existingValue ? [existingValue] : []);
          // Ajouter le nouveau cours au tableau s'il n'est pas déjà présent
          if (!existingIds.includes(newCourse.id)) {
            next[targetSlotKey] = [...existingIds, newCourse.id];
          }
        });
        return next;
      });

      setToastMessage({ msg: `Copie de ${originalCourse.subject} créée`, type: 'success' });
    } else {
      // Comportement normal : déplacer la carte et tous les cours similaires
      const allSimilarCourseIds = [sourceId, ...similarCourses.map(c => c.id)];

      setSchedule(prev => {
        const next = { ...prev as Record<string, string | null | string[]> };
        // Retirer tous les cours similaires de tous les créneaux de cette semaine pour tous les groupes concernés
        groupsToPlace.forEach(group => {
          Object.keys(next).forEach(k => {
            if (k.startsWith(`${semester}|w${currentWeek}|${group}|`)) {
              const value = next[k];
              // Normaliser la valeur pour gérer les cas string | null | string[]
              if (Array.isArray(value)) {
                const filtered = value.filter(id => !allSimilarCourseIds.includes(id));
                next[k] = filtered.length > 0 ? filtered : null;
              } else if (allSimilarCourseIds.includes(value as string)) {
                next[k] = null;
              }
            }
          });
        });
        // Ajouter tous les cours similaires au nouveau créneau pour tous les groupes concernés
        groupsToPlace.forEach(group => {
          const targetSlotKey = `${semester}|w${currentWeek}|${group}|${targetTimeSlot}`;
          const existingValue = next[targetSlotKey];
          const existingIds = Array.isArray(existingValue) ? existingValue : (existingValue ? [existingValue] : []);

          // Trouver le cours approprié pour ce groupe (le cours dont le mainGroup correspond)
          const courseForGroup = [originalCourse, ...similarCourses].find(c => c.mainGroup === group) || originalCourse;

          // Ajouter le cours approprié pour ce groupe s'il n'est pas déjà présent
          if (!existingIds.includes(courseForGroup.id)) {
            next[targetSlotKey] = [...existingIds, courseForGroup.id];
          } else {
            // Si déjà présent, utiliser le tableau existant
            next[targetSlotKey] = existingIds.length > 0 ? existingIds : courseForGroup.id;
          }
        });
        return next;
      });
    }
  };

  const handleUnassign = (courseId: string, slotKey?: string) => {
    setSchedule(prev => {
      const next = { ...prev as Record<string, string | null | string[]> };
      if (slotKey) {
        // Retirer le cours spécifique du créneau spécifié
        const value = next[slotKey];
        if (Array.isArray(value)) {
          const filtered = value.filter(id => id !== courseId);
          next[slotKey] = filtered.length > 0 ? filtered : null;
        } else if (value === courseId) {
          next[slotKey] = null;
        }
      } else {
        // Ancien comportement : retirer le cours de tous les créneaux (pour compatibilité)
        Object.keys(next).forEach(k => {
          const value = next[k];
          if (Array.isArray(value)) {
            const filtered = value.filter(id => id !== courseId);
            next[k] = filtered.length > 0 ? filtered : null;
          } else if (value === courseId) {
            next[k] = null;
          }
        });
      }
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
  // Récupérer tous les cours placés cette semaine dans n'importe quel groupe
  const placedIdsThisWeek = Object.keys(schedule)
    .filter(k => {
      // Vérifier si la clé correspond à cette semaine et ce semestre
      const parts = k.split('|');
      if (parts.length < 3) return false;
      const [sem, week, group] = parts;
      return sem === semester && week === `w${currentWeek}` && schedule[k];
    })
    .flatMap(k => {
      const value = schedule[k];
      // Normaliser la valeur (gérer les cas string | null | string[])
      return Array.isArray(value) ? value : (value ? [value] : []);
    });
  // Filtrer les cours: un cours est considéré comme "placé" s'il est placé OU si un cours similaire est placé
  const sidebarCourses = groupCourses.filter(c => {
    // Vérifier d'abord si ce cours spécifique est placé
    const isPlacedDirectly = Object.keys(schedule)
      .filter(k => {
        const parts = k.split('|');
        if (parts.length < 3) return false;
        const [sem, week] = parts;
        return sem === semester && week === `w${currentWeek}` && schedule[k];
      })
      .some(k => {
        const value = schedule[k];
        const courseIds = Array.isArray(value) ? value : (value ? [value] : []);
        return courseIds.includes(c.id);
      });

    if (isPlacedDirectly) return false; // Le cours est déjà placé

    // Trouver tous les cours similaires (même matière, type, enseignant, salle, semestre)
    const similarCourses = assignmentRows.filter(r =>
      r.id !== c.id &&
      r.subject === c.subject &&
      r.type === c.type &&
      r.teacher === c.teacher &&
      r.room === c.room &&
      r.semester === c.semester
    );

    // Vérifier si un cours similaire est placé dans le planning
    const isSimilarPlaced = Object.keys(schedule)
      .filter(k => {
        const parts = k.split('|');
        if (parts.length < 3) return false;
        const [sem, week] = parts;
        return sem === semester && week === `w${currentWeek}` && schedule[k];
      })
      .some(k => {
        const value = schedule[k];
        const courseIds = Array.isArray(value) ? value : (value ? [value] : []);
        // Vérifier si un cours similaire est dans ce créneau
        return courseIds.some(id => similarCourses.some(sc => sc.id === id));
      });

    // Ne pas afficher le cours s'il est placé directement ou si un cours similaire est placé
    return !isPlacedDirectly && !isSimilarPlaced;
  });

  const gridTemplate = `24px repeat(${config.timeSlots.length}, minmax(150px, 1fr))`;
  const gridBaseClasses = "grid w-full";

  // Show login screen if not authenticated
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div id="export-container" className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden relative" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999]">
          <div className={`px-4 py-2 rounded-lg shadow-xl font-bold text-white flex items-center gap-2 ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            <AlertTriangle size={18} />
            <span className="text-xs">{toastMessage.msg}</span>
            <button onClick={() => setToastMessage(null)}><X size={14} /></button>
          </div>
        </div>
      )}

      <div id="export-container" className="flex flex-1 flex-col overflow-hidden bg-white">
        <HeaderBanner
          semester={semester} setSemester={setSemester}
          group={activeMainGroup} setGroup={setActiveMainGroup}
          week={currentWeek} setWeek={setCurrentWeek}
          totalWeeks={config.totalWeeks}
          startStr={weekDates.startStr} endStr={weekDates.endStr}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          dynamicGroups={dynamicGroups}
          config={config}
        />

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-12 bg-slate-900 text-slate-400 flex flex-col items-center py-4 gap-6 shrink-0 z-30 no-export">
            <button onClick={() => {
              if (activeTab === 'planning') {
                setCardsSidebarVisible(!cardsSidebarVisible);
              } else {
                setActiveTab('planning');
                setCardsSidebarVisible(true);
              }
            }} className={`p-2 rounded-xl transition-colors ${activeTab === 'planning' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Planning"><Calendar size={20} /></button>
            
            {/* Admin-only buttons */}
            {currentUser?.role === 'admin' && (
              <>
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

                {/* User Management - Admin only */}
                <button onClick={() => setActiveTab('users')} className={`p-2 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`} title="Utilisateurs"><Users size={20} /></button>
              </>
            )}

            {/* Spacer to push logout to bottom */}
            <div className="flex-1"></div>

            {/* Logout button */}
            <button onClick={() => setCurrentUser(null)} className="p-2 rounded-xl transition-colors hover:bg-red-600 hover:text-white text-slate-400" title="Déconnexion"><LogOut size={20} /></button>
          </aside>

          <main className="flex-1 flex flex-col min-w-0 h-full">
            {activeTab === 'planning' && (
              <DndContext onDragStart={(e) => setActiveDragItem(assignmentRows.find(r => r.id === e.active.id) || null)} onDragEnd={handleDragEnd}>
                <div className="flex flex-1 overflow-hidden h-full">
                  {cardsSidebarVisible && currentUser?.role === 'admin' && (
                    <div className="w-48 bg-white border-r border-slate-200 flex flex-col shrink-0 p-2 no-export">
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
                  )}

                  <div className="flex-1 p-2 bg-slate-200 overflow-hidden flex flex-col min-h-0 planning-container">
                    <div id="calendar-capture-zone" className="flex-1 bg-white rounded-lg shadow border border-slate-300 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div style={{ gridTemplateColumns: gridTemplate, backgroundColor: 'white', minWidth: '800px' }} className={`${gridBaseClasses} sticky top-0 z-20`}>
                        <div className="p-1 text-center text-[10px] font-bold text-gray-800 bg-white border border-black"></div>
                        {config.timeSlots.map((t, index) => (
                          <div key={t} className={`p-1 text-center text-xs font-black text-gray-800 uppercase border border-black ${index < config.timeSlots.length - 1 ? 'mr-4' : ''}`} style={{ backgroundColor: '#c4d79b', fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
                            {t}
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 flex flex-col items-stretch bg-slate-50/30 gap-1 min-h-0 container-export-rows">
                        {DAYS.map((day, dayIndex) => (
                          <div key={day} className={dayIndex > 0 && (day === 'Mercredi' || day === 'Jeudi') ? 'mt-4' : ''}>
                            <div style={{ gridTemplateColumns: gridTemplate, minWidth: '800px' }} className={`${gridBaseClasses} w-full bg-white items-stretch overflow-visible min-h-[40px] flex-1 export-row`}>
                            <div className="bg-white flex items-center justify-center py-1 overflow-visible min-h-[36px] border border-black" style={{ backgroundColor: '#c4d79b', fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
                              <span className="inline-block font-black text-gray-800 text-[11px] -rotate-90 uppercase tracking-widest leading-none whitespace-nowrap">{day}</span>
                            </div>
                            {config.timeSlots.map(time => {
                              const slotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
                              const courseValue = schedule[slotKey];
                              // Normaliser la valeur (gérer les cas string | null | string[])
                              const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                              const combinedCourse = getCombinedCourseInfo(courseIds);
                              return (
                                <div key={time} className="p-1 relative flex items-stretch mr-4 last:mr-0">
                                  <DroppableSlot id={`${day}|${time}`}>
                                    {combinedCourse && (
                                      <CourseBadge
                                        course={{ ...combinedCourse, id: courseIds[0] }}
                                        onUnassign={() => handleUnassignBatch(courseIds)}
                                        isMatch={isCourseMatch(combinedCourse)}
                                        hasConflict={hasConflict(day, time, courseIds)}
                                        compact={compact}
                                        customSubjects={customSubjects}
                                        schedule={schedule}
                                        assignmentRows={assignmentRows}
                                        currentUser={currentUser}
                                        className="flex-1"
                                      />
                                    )}
                                  </DroppableSlot>
                                </div>
                              );
                            })}
                          </div>
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
                                        <TeacherSelector
                                          value={matiere.enseignantsCM || ''}
                                          allTeachers={UNIQUE_TEACHERS}
                                          onChange={(val: string) => {
                                            console.log('Modification enseignants CM:', val);
                                            const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                            const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                            if (realSemIdx !== -1) {
                                              const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                              if (realMatIdx !== -1) {
                                                newSubjects[realSemIdx].matieres[realMatIdx].enseignantsCM = val;
                                                setCustomSubjects(newSubjects);
                                              }
                                            }
                                          }}
                                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-blue-50"
                                          placeholder="Enseignant CM"
                                        />
                                      </div>
                                      <div className="col-span-3">
                                        <label className="block text-xs font-bold text-green-600 uppercase mb-1">Profs TD/TP</label>
                                        <TeacherSelector
                                          value={matiere.enseignantsTD || ''}
                                          allTeachers={UNIQUE_TEACHERS}
                                          onChange={(val: string) => {
                                            console.log('Modification enseignants TD:', val);
                                            const newSubjects = JSON.parse(JSON.stringify(customSubjects));
                                            const realSemIdx = newSubjects.findIndex((s: any) => s.semestre === semestre.semestre);
                                            if (realSemIdx !== -1) {
                                              const realMatIdx = newSubjects[realSemIdx].matieres.findIndex((m: any) => m.code === matiere.code);
                                              if (realMatIdx !== -1) {
                                                newSubjects[realSemIdx].matieres[realMatIdx].enseignantsTD = val;
                                                setCustomSubjects(newSubjects);
                                              }
                                            }
                                          }}
                                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-green-50"
                                          placeholder="Intervenants TD/TP"
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

            {/* User Management Tab - Admin Only */}
            {activeTab === 'users' && currentUser?.role === 'admin' && (
              <div className="p-6 overflow-auto h-full bg-slate-50">
                <UserManagement />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function DraggableCard({ course, compact, searchQuery, customSubjects, schedule, assignmentRows }: any) {
  if (searchQuery && !course.subject.toLowerCase().includes(searchQuery.toLowerCase())) return null;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: course.id });
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const colors = getCourseColor(course.type);
  const style = { opacity: isDragging ? 0.4 : 1, transform: 'none' };
  const compactClasses = compact ? "p-1.5" : "p-3";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') setIsCtrlPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setIsCtrlPressed(false); };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  if (compact) {
    let teacher, room;
    if (course.type === 'CM') {
      teacher = (course.teacher || '').split('/')[0]?.trim() || '';
      room = (course.room || '').split('/')[0]?.trim() || '';
    }
    else {
      teacher = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
      room = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
    }
    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`relative rounded-lg border-2 ${colors.border} border-l-2 ${colors.borderLeft} ${colors.bg} ${compactClasses} cursor-grab active:cursor-grabbing hover:shadow shadow-sm ${isDragging && isCtrlPressed ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
        {isDragging && isCtrlPressed && <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">COPIE</div>}
        <div className="absolute top-2 right-2 flex gap-1">
          <span className={`text-[7px] font-black px-1 py-0.5 rounded ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sessionsInfo.realized}/{sessionsInfo.total}</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${colors.badge}`}>{course.type}</span>
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
        <div className="mt-2 flex items-center gap-2"><Users size={14} className="text-slate-400" /><span className="text-[10px] font-normal text-red-600 truncate">{teacher}</span></div>
        <div className="mt-1 flex items-center gap-2"><MapPin size={14} className="text-slate-400" /><span className="text-[10px] font-normal text-blue-600 truncate">{room || '?'}</span></div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`rounded-md border-2 ${colors.border} border-l-4 ${colors.borderLeft} ${colors.bg} ${compactClasses} cursor-grab active:cursor-grabbing hover:shadow-md transition-all mb-2 shadow-sm ${isDragging && isCtrlPressed ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
      {isDragging && isCtrlPressed && <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">COPIE</div>}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-medium text-slate-900 truncate" style={{ maxWidth: '7rem' }}>{course.subject}</span>
            <span className={`text-[7px] font-black px-1 py-0.5 rounded ${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sessionsInfo.realized}/{sessionsInfo.total}</span>
          </div>
          <span className={`text-[8px] font-black px-1 rounded text-white ${colors.badge}`}>{course.type}</span>
        </div>
        <div className="text-[8px] font-normal text-slate-700 truncate whitespace-nowrap overflow-hidden" style={{ maxWidth: '10rem' }}>
          {(() => {
            const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
            const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
            return matiereData?.libelle || course.subjectLabel;
          })()}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Users size={10} className="text-slate-400" /><span className="text-[7px] font-normal text-red-600 truncate" style={{ maxWidth: '8rem' }}>
            {(() => {
              let teacherData;
              if (course.type === 'CM') { teacherData = (course.teacher || '').split('/')[0]?.trim() || ''; }
              else { teacherData = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/'); }
              return teacherData || '?';
            })()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={10} className="text-slate-400" /><span className="text-[7px] font-normal text-blue-600 truncate" style={{ maxWidth: '8rem' }}>
            {(() => {
              let roomData;
              if (course.type === 'CM') { roomData = (course.room || '').split('/')[0]?.trim() || ''; }
              else { roomData = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/'); }
              return roomData || '?';
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}

function DroppableSlot({ id, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isEmpty = !children;
  
  return (
    <div 
      ref={setNodeRef} 
      className={`w-full h-full min-h-[65px] transition-colors flex flex-col ${
        isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10' : ''
      }`}
    >
      {isEmpty ? (
        // Tableau vide avec structure visible en gris
        <div className="w-full h-full border border-gray-400 bg-gray-100 flex flex-col">
          {/* Première ligne du tableau vide */}
          <div className="flex h-8 border-b border-gray-400">
            <div className="flex-1 border-r border-gray-400"></div>
            <div className="w-12 border-r border-gray-400"></div>
            <div className="w-12"></div>
          </div>
          {/* Deuxième ligne du tableau vide */}
          <div className="flex-1 border-b border-gray-400"></div>
          {/* Troisième ligne du tableau vide */}
          <div className="h-8"></div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const CourseBadge = ({ course, onUnassign, isMatch, hasConflict, compact, customSubjects, schedule, assignmentRows, currentUser, className = "" }: any) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: course.id });
  const style = { opacity: isDragging ? 0.4 : 1 };
  
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}
      className={`relative w-full h-full border border-black bg-white flex flex-col group hover:shadow-lg transition-all ${hasConflict ? 'bg-red-50 border-red-500 animate-pulse' : ''} ${isMatch ? 'ring-2 ring-pink-500' : ''} ${className}`}>
      
      <button onPointerDown={(e) => { e.stopPropagation(); onUnassign(); }} className={`absolute top-1 right-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 no-print z-10 bg-white rounded-full p-0.5 ${currentUser?.role !== 'admin' ? 'hidden' : ''}`}><X size={10} /></button>
      
      {/* Première ligne du tableau : Code matière | Type | Salle */}
      <div className="flex h-8 border-b border-black">
        <div className="flex-1 px-1 py-1 border-r border-black flex items-center justify-center bg-white overflow-hidden">
          <span className="font-bold text-xs text-black text-center truncate">{course.subject}</span>
        </div>
        <div className="w-12 px-1 py-1 border-r border-black flex items-center justify-center bg-white overflow-hidden">
          <span className="font-bold text-xs text-black text-center truncate">{course.type}</span>
        </div>
        <div className="w-12 px-1 py-1 flex items-center justify-center bg-white overflow-hidden">
          <span className="font-bold text-xs text-black text-center truncate">{(() => {
            const rooms = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
            return rooms || '?';
          })()}</span>
        </div>
      </div>
      
      {/* Deuxième ligne du tableau : Nom complet de la matière */}
      <div className="flex-1 px-1 py-1 border-b border-black flex items-center bg-white overflow-hidden">
        <span className="text-xs text-black font-medium text-center w-full truncate leading-tight">{course.subjectLabel || course.subject}</span>
      </div>
      
      {/* Troisième ligne du tableau : Enseignant */}
      <div className="h-8 px-1 py-1 flex items-center justify-center bg-white overflow-hidden">
        <span className="text-xs font-bold text-red-600 text-center truncate">{(() => {
          const teachers = (course.teacher || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
          return teachers || '?';
        })()}</span>
      </div>
      
    </div>
  );
};

function getCourseColor(type: CourseType | string) {
  if (typeof type === 'string' && type.includes('/')) {
    return { bg: 'bg-purple-50', border: 'border-purple-300', borderLeft: 'border-l-purple-600', badge: 'bg-purple-600' };
  }
  switch (type) {
    case 'CM': return { bg: 'bg-emerald-50', border: 'border-emerald-300', borderLeft: 'border-l-emerald-600', badge: 'bg-emerald-600' };
    case 'TD': return { bg: 'bg-blue-50', border: 'border-blue-300', borderLeft: 'border-l-blue-600', badge: 'bg-blue-600' };
    case 'TP': return { bg: 'bg-orange-50', border: 'border-orange-300', borderLeft: 'border-l-orange-600', badge: 'bg-orange-600' };
    default: return { bg: 'bg-gray-50', border: 'border-gray-300', borderLeft: 'border-l-gray-600', badge: 'bg-gray-600' };
  }
}

function TeacherSelector({ value, onChange, allTeachers, placeholder, className }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const teachers = (value || '').split('/').map((t: string) => t.trim()).filter(Boolean);
  const removeTeacher = (e: React.MouseEvent, teacher: string) => {
    e.stopPropagation();
    const newList = teachers.filter((t: string) => t !== teacher);
    onChange(newList.join('/'));
  };
  return (
    <>
      <div onClick={() => setIsModalOpen(true)} className={`${className} cursor-pointer min-h-[40px] p-1.5 flex flex-wrap gap-1 items-start bg-white border border-slate-300 rounded overflow-hidden hover:border-blue-400 transition-all group`}>
        {teachers.length > 0 ? (
          teachers.map((t: string) => (
            <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-colors group/chip">
              {t}
              <button onClick={(e) => removeTeacher(e, t)} className="opacity-40 group-hover/chip:opacity-100"><X size={10} /></button>
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-[11px] px-1 py-1">{placeholder}</span>
        )}
        <div className="ml-auto self-center p-1 text-slate-400 group-hover:text-blue-600"><Plus size={14} /></div>
      </div>
      {isModalOpen && <TeacherSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedTeachers={value} allTeachers={allTeachers} onSelect={onChange} />}
    </>
  );
}

function TeacherSelectionModal({ isOpen, onClose, selectedTeachers, allTeachers, onSelect }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const selectedList = (selectedTeachers || '').split('/').map((t: string) => t.trim()).filter(Boolean);
  const filteredTeachers = allTeachers.filter((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
  const toggleTeacher = (teacher: string) => {
    let newList;
    if (selectedList.includes(teacher)) {
      newList = selectedList.filter((t: string) => t !== teacher);
    } else {
      newList = [...selectedList, teacher];
    }
    onSelect(newList.join('/'));
  };
  const handleAddNew = () => {
    if (newTeacher && newTeacher.trim()) {
      const name = newTeacher.trim();
      if (!selectedList.includes(name)) { onSelect([...selectedList, name].join('/')); }
      setNewTeacher('');
      setSearchTerm('');
    }
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2"><Users size={22} className="text-blue-600" /> Profs de la matière</h3>
            <p className="text-xs text-slate-500 font-medium">Sélectionnez ou ajoutez des intervenants</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto bg-slate-50/50">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm ring-4 ring-blue-50">
            <label className="block text-[10px] font-black text-blue-600 uppercase mb-2 tracking-wider">Ajouter un prof non listé</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Nom complet du professeur..." value={newTeacher} onChange={e => setNewTeacher(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNew()} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold" />
              <button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold text-sm flex items-center gap-2"><Plus size={18} /> Ajouter</button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ou choisir dans la liste ({allTeachers.length})</label></div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Chercher parmi les profs existants..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 ring-blue-500/10 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
              {filteredTeachers.map((teacher: string) => (
                <label key={teacher} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedList.includes(teacher) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedList.includes(teacher) ? 'bg-white border-white' : 'border-slate-300 bg-white'}`}>{selectedList.includes(teacher) && <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />}</div>
                  <input type="checkbox" checked={selectedList.includes(teacher)} onChange={() => toggleTeacher(teacher)} className="hidden" />
                  <span className="text-sm font-bold tracking-tight">{teacher}</span>
                </label>
              ))}
              {filteredTeachers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  <Search size={32} className="opacity-20 mb-2" /><p className="text-xs italic font-medium">Aucun enseignant trouvé pour "{searchTerm}"</p>
                </div>
              )}
            </div>
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



