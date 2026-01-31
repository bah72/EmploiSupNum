"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
        else if (row.type.startsWith('TD')) stats[teacher].td++;
        else if (row.type.startsWith('TP')) stats[teacher].tp++;
      });
    });

    // Calculer l'équivalent CM : CM + (TD + TP) * 2/3 (en nombre de séances)
    Object.values(stats).forEach(stat => {
      const eqCm = stat.cm + ((stat.td + stat.tp) * 2 / 3);
      stat.total = eqCm.toFixed(1); // Garder 1 décimale
    });

    return stats;
  }
};

// --- HEADER BANNER (en dehors du composant App pour éviter les re-rendus) ---
const HeaderBanner = React.memo(({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, handleSearchChange, searchInputRef, dynamicGroups, config, handleSaveToDatabase, handlePrint, setCurrentUser, currentUser, loadFullDataset, assignmentRows, isClient, activeMainGroup, diagnoseCourses, migrateToNewSystem, refreshCardsOnly, clearScheduleOnly, fixSubGroups }: any) => {
  return (
    <div className="flex flex-col bg-white shrink-0 shadow-sm z-40 print-header" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
      <div className="flex items-center justify-between w-full h-10 md:h-12 px-3 md:px-6 overflow-hidden" style={{ backgroundColor: '#c4d79b' }}>
        <div className="shrink-0 pr-2 md:pr-4 h-full flex items-center">
          <img src="/rim.png" alt="RIM" className="h-6 md:h-8 w-auto object-contain" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-base md:text-lg font-semibold text-gray-800 leading-tight tracking-wide">Institut Supérieur du Numérique</h1>
          <h2 className="text-xs md:text-sm font-medium text-gray-700 uppercase tracking-widest">Emploi du temps</h2>
        </div>
        <div className="shrink-0 pl-2 md:pl-4 h-full flex items-center">
          <img src="/supnum.png" alt="SupNum" className="h-6 md:h-8 w-auto object-contain" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 gap-2 w-full">
        <div className="flex items-center gap-6">
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
          Du&nbsp;<span className="text-blue-700 font-bold mx-1">{startStr}</span>&nbsp;au&nbsp;<span className="text-blue-700 font-bold mx-1">{endStr}</span>
        </div>
        <div className="flex items-center gap-2 no-export">
          <div className="relative group no-print">
            <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
            <input ref={searchInputRef} type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Chercher..." className="w-28 focus:w-40 bg-white border border-slate-300 rounded-full py-1 pl-6 pr-4 text-[12px] font-medium transition-all outline-none" />
          </div>
          <button onClick={() => handleSaveToDatabase()} className={`flex items-center justify-center bg-green-500 hover:bg-green-600 text-white border border-green-600 rounded p-2 shadow-sm transition-all font-bold text-sm no-print ${currentUser?.role !== 'admin' ? 'hidden' : ''}`} title="Sauvegarder en base de données">
            <Save size={16} />
          </button>
          <button onClick={() => handlePrint()} className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded p-2 shadow-sm transition-all font-bold text-sm no-print" title="Imprimer le planning">
            <Printer size={16} />
          </button>
          <button onClick={() => setCurrentUser(null)} className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white border border-red-600 rounded p-2 shadow-sm transition-all font-bold text-sm no-print" title="Se déconnecter">
            <LogOut size={16} />
          </button>
          {currentUser?.role === 'admin' && (
            <>
              <button onClick={() => {
                console.log('Debug info:', {
                  assignmentRowsLength: assignmentRows.length,
                  dynamicGroupsLength: dynamicGroups.length,
                  isClient,
                  semester,
                  activeMainGroup
                });
                loadFullDataset(false);
              }} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded p-1.5 shadow-sm transition-all no-print" title="Debug (Réinitialise tout)">🐛</button>

              <button onClick={refreshCardsOnly} className="flex items-center justify-center bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200 rounded p-1.5 shadow-sm transition-all no-print" title="Rafraîchir seulement les cartes">🔄</button>

              <button onClick={clearScheduleOnly} className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1.5 shadow-sm transition-all no-print" title="Vider seulement le planning">🗑️</button>

              <button onClick={migrateToNewSystem} className="flex items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded p-1.5 shadow-sm transition-all no-print" title="Migrer vers TD1/TD2/TP1/TP2 (conserve les affectations)">MC</button>

              <button onClick={diagnoseCourses} className="flex items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 rounded p-1.5 shadow-sm transition-all no-print" title="Diagnostiquer les problèmes">🔍</button>

              <button onClick={fixSubGroups} className="flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded p-1.5 shadow-sm transition-all no-print" title="Corriger les sous-groupes">🔧</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [semester, setSemester] = useState<string>('S1');
  const [activeTab, setActiveTab] = useState<'manage' | 'planning' | 'config' | 'data' | 'users'>('planning');
  const [activeMainGroup, setActiveMainGroup] = useState("Groupe 1");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Stabiliser la fonction de changement de recherche pour éviter les re-rendus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Ref pour maintenir le focus de l'input de recherche
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mémoriser les autres callbacks pour éviter les re-rendus du HeaderBanner
  const handleSemesterChange = useCallback((value: string) => setSemester(value), []);
  const handleGroupChange = useCallback((value: string) => setActiveMainGroup(value), []);
  const handleWeekChange = useCallback((value: number) => setCurrentWeek(value), []);
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

    // Plusieurs cours - créer une carte combinée avec meilleur formatage
    const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
    if (courses.length === 0) return null;

    // Améliorer l'affichage des cours combinés - éliminer les doublons
    const subjects = [...new Set(courses.map(c => c.subject))].join('/');
    const subjectLabels = [...new Set(courses.map(c => c.subjectLabel))].join('/');
    const teachers = [...new Set(courses.map(c => c.teacher))].join('/');
    const rooms = [...new Set(courses.map(c => c.room))].join('/');

    // Formater les types intelligemment (ex: TP1 + G1 -> TP11)
    const formattedTypes = courses.map(c => {
      const groupNum = (c.mainGroup || '').replace(/[^0-9]/g, '');
      const typeLetters = (c.type || '').replace(/[0-9]/g, ''); // TP, TD...
      const typeNum = (c.type || '').replace(/[^0-9]/g, ''); // 1, 2...

      if (typeLetters === 'CM') return 'CM';
      if (groupNum && typeNum) return `${typeLetters}${groupNum}${typeNum}`;
      return c.type;
    });
    const types = [...new Set(formattedTypes)].join('/');

    // Pour les cours parallèles, utiliser le premier type pour la couleur de base
    const primaryType = courses[0].type;

    return {
      id: courseIds.join('_'),
      subject: subjects,
      subjectLabel: subjectLabels,
      type: primaryType, // Utiliser le type principal pour la couleur
      mainGroup: courses[0].mainGroup,
      sharedGroups: courses[0].sharedGroups,
      subLabel: types, // Afficher tous les types combinés
      teacher: teachers,
      room: rooms,
      semester: courses[0].semester,
      isCombined: true,
      originalCourses: courses,
      // Ajouter des informations pour l'affichage amélioré - avec valeurs uniques
      combinedCount: courses.length,
      combinedTypes: [...new Set(courses.map(c => c.type))],
      combinedSubjects: [...new Set(courses.map(c => c.subject))],
      combinedRooms: [...new Set(courses.map(c => c.room))],
      combinedTeachers: [...new Set(courses.map(c => c.teacher))]
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
    subGroupsPerGroup: 2, // Nombre de sous-groupes TD/TP par groupe principal
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
        const parsed = JSON.parse(savedRooms);
        if (Array.isArray(parsed)) {
          setCustomRooms(parsed);
        } else {
          // Si le format est corrompu (ex: ancien format objet), on réinitialise
          setCustomRooms(ALL_ROOMS);
          localStorage.removeItem('supnum_custom_rooms');
        }
      } catch (e) {
        console.error('Erreur lors du chargement des salles:', e);
      }
    }

    const savedSubjects = localStorage.getItem('supnum_custom_subjects');
    if (savedSubjects) {
      try {
        const parsedSubjects = JSON.parse(savedSubjects);

        if (!Array.isArray(parsedSubjects)) {
          console.warn('Format de matières invalide dans localStorage, reset.');
          setCustomSubjects(MASTER_DB);
        } else {
          // MIGRATION: Assurer que les champs enseignantsCM et enseignantsTD existent

          parsedSubjects.forEach((sem: any) => {
            sem.matieres.forEach((mat: any) => {
              if (mat.enseignantsCM === undefined) mat.enseignantsCM = mat.enseignants || '';
              if (mat.enseignantsTD === undefined) mat.enseignantsTD = mat.enseignants || '';
            });
          });
          setCustomSubjects(parsedSubjects);
        }
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
          const groups = ["Groupe 1", "Groupe 2", "Groupe 3", "Groupe 4"];
          groups.forEach(group => {
            const teachersCM = matiere.enseignantsCM || matiere.enseignants || '';
            const teachersTD = matiere.enseignantsTD || matiere.enseignants || '';
            const defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";

            // Ligne CM
            newRows.push({
              id: Math.random().toString(36).substr(2, 9),
              subject: matiere.code,
              subjectLabel: matiere.libelle,
              type: 'CM',
              mainGroup: group,
              sharedGroups: [group],
              subLabel: 'CM',
              teacher: teachersCM.split('/')[0]?.trim() || 'Non assigné',
              room: 'Khawarizmi',
              semester: semData.semestre
            });

            // Lignes TD (1 et 2 par défaut)
            [1, 2].forEach(num => {
              newRows.push({
                id: Math.random().toString(36).substr(2, 9),
                subject: matiere.code,
                subjectLabel: matiere.libelle,
                type: `TD${num}` as CourseType,
                mainGroup: group,
                sharedGroups: [group],
                subLabel: `TD${group.replace('Groupe ', '')}${num}`,
                teacher: teachersTD.split('/')[0]?.trim() || 'Non assigné',
                room: defaultRoom,
                semester: semData.semestre
              });
            });

            // Lignes TP (1 et 2 par défaut)
            [1, 2].forEach(num => {
              const tpRoom = group === "Groupe 1" ? "Lab 1" : group === "Groupe 2" ? "Lab 2" : group === "Groupe 3" ? "Lab 3" : "Lab 4";
              newRows.push({
                id: Math.random().toString(36).substr(2, 9),
                subject: matiere.code,
                subjectLabel: matiere.libelle,
                type: `TP${num}` as CourseType,
                mainGroup: group,
                sharedGroups: [group],
                subLabel: `TP${group.replace('Groupe ', '')}${num}`,
                teacher: teachersTD.split('/')[0]?.trim() || 'Non assigné',
                room: tpRoom,
                semester: semData.semestre
              });
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
          m.enseignantsCM.split('/').forEach((t: string) => {
            if (t.trim()) set.add(t.trim());
          });
        }
        // Ajouter les enseignants TD
        if (m.enseignantsTD) {
          m.enseignantsTD.split('/').forEach((t: string) => {
            if (t.trim()) set.add(t.trim());
          });
        }
        // Fallback vers l'ancien champ pour compatibilité
        if (m.enseignants && !m.enseignantsCM && !m.enseignantsTD) {
          m.enseignants.split('/').forEach((t: string) => {
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

  // Génération des sous-groupes TD/TP
  const allSubGroups = useMemo(() => {
    const subGroups: { id: string, label: string, mainGroup: string, type: 'TD' | 'TP' }[] = [];

    for (let groupIndex = 1; groupIndex <= config.numberOfGroups; groupIndex++) {
      const mainGroup = `Groupe ${groupIndex}`;

      // Générer les sous-groupes TD
      for (let subIndex = 1; subIndex <= config.subGroupsPerGroup; subIndex++) {
        subGroups.push({
          id: `TD${groupIndex}${subIndex}`,
          label: `TD${groupIndex}${subIndex}`,
          mainGroup,
          type: 'TD'
        });
      }

      // Générer les sous-groupes TP
      for (let subIndex = 1; subIndex <= config.subGroupsPerGroup; subIndex++) {
        subGroups.push({
          id: `TP${groupIndex}${subIndex}`,
          label: `TP${groupIndex}${subIndex}`,
          mainGroup,
          type: 'TP'
        });
      }
    }

    return subGroups;
  }, [config.numberOfGroups, config.subGroupsPerGroup]);

  // Fonction de diagnostic des cours problématiques
  const diagnoseCourses = () => {
    const problematicCourses = assignmentRows.filter(course => {
      if (course.type.startsWith('TD') && course.subLabel && !course.subLabel.startsWith('TD')) return true;
      if (course.type.startsWith('TP') && course.subLabel && !course.subLabel.startsWith('TP')) return true;
      if (course.type === 'CM' && course.subLabel && course.subLabel !== 'CM') return true;
      return false;
    });

    console.log('🔍 Diagnostic des cours problématiques:', {
      total: assignmentRows.length,
      problematic: problematicCourses.length,
      details: problematicCourses.map(c => ({
        id: c.id,
        subject: c.subject,
        type: c.type,
        subLabel: c.subLabel,
        mainGroup: c.mainGroup
      }))
    });

    if (problematicCourses.length > 0) {
      setToastMessage({
        msg: `${problematicCourses.length} cours avec incohérence type/label détectés (voir console)`,
        type: 'error'
      });
    } else {
      setToastMessage({ msg: 'Aucun problème détecté !', type: 'success' });
    }
  };

  // Fonction de migration vers le nouveau système (SANS perdre les affectations)
  const migrateToNewSystem = () => {
    if (!confirm('Migrer vers le nouveau système TD1/TD2/TP1/TP2 ? (Conserve les affectations d\'enseignants)')) return;

    setAssignmentRows(prev => {
      // Créer un compteur pour chaque combinaison type/matière/groupe/semestre
      const counters: Record<string, number> = {};

      return prev.map(course => {
        let newType = course.type;
        let newSubLabel = course.subLabel || course.type;

        // Migrer les anciens types vers les nouveaux
        if (course.type.startsWith('TD') || course.type.startsWith('TP')) {
          const baseType = course.type.startsWith('TD') ? 'TD' : 'TP';

          // Créer une clé unique pour ce type de cours
          const key = `${baseType}-${course.subject}-${course.mainGroup}-${course.semester}`;

          // Incrémenter le compteur pour cette combinaison
          counters[key] = (counters[key] || 0) + 1;

          // Assigner le nouveau type (TD1, TD2, TP1, TP2, etc.)
          newType = `${baseType}${counters[key]}` as CourseType;

          // Générer le nouveau subLabel
          const groupNumber = course.mainGroup.replace('Groupe ', '');
          newSubLabel = `${baseType}${groupNumber}${counters[key]}`;
        }

        return {
          ...course,
          type: newType,
          subLabel: newSubLabel
        };
      });
    });

    setToastMessage({ msg: 'Migration vers le nouveau système terminée ! Affectations conservées.', type: 'success' });
  };

  // Fonction pour rafraîchir SEULEMENT les cartes (assignmentRows)
  const refreshCardsOnly = () => {
    if (!confirm('Rafraîchir seulement les cartes ? (Conserve le planning et les affectations des profs)')) return;

    const newRows: AssignmentRow[] = [];

    // Fonction pour trouver une carte existante correspondante
    const findExistingCard = (subject: string, type: string, mainGroup: string, semester: string) => {
      return assignmentRows.find(row =>
        row.subject === subject &&
        row.type === type &&
        row.mainGroup === mainGroup &&
        row.semester === semester
      );
    };

    // IMPORTANT: Utiliser customSubjects (données modifiées) au lieu de MASTER_DB
    customSubjects.forEach((semData: any) => {
      semData.matieres.forEach((matiere: any) => {
        // Utiliser les enseignants CM pour les cours CM (seulement si pas d'existant)
        const defaultTeachersCM = matiere.enseignantsCM || matiere.enseignants || '';
        // Utiliser les enseignants TD pour les cours TD (seulement si pas d'existant)
        const defaultTeachersTD = matiere.enseignantsTD || matiere.enseignants || '';

        // Créer les cours CM pour chaque groupe principal
        dynamicGroups.forEach(group => {
          const existing = findExistingCard(matiere.code, 'CM', group, semData.semestre);
          newRows.push({
            id: existing?.id || Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: 'CM',
            mainGroup: group,
            sharedGroups: [group],
            subLabel: 'CM',
            // CONSERVER l'enseignant et la salle existants si disponibles
            teacher: existing?.teacher || defaultTeachersCM.split('/')[0]?.trim() || 'Non assigné',
            room: existing?.room || 'Khawarizmi',
            semester: semData.semestre
          });
        });

        // Créer les cours TD pour chaque sous-groupe
        allSubGroups.filter(sg => sg.type === 'TD').forEach((subGroup, index) => {
          const defaultRoom = subGroup.mainGroup === "Groupe 1" ? "101" :
            subGroup.mainGroup === "Groupe 2" ? "201" :
              subGroup.mainGroup === "Groupe 3" ? "202" : "203";

          // Utiliser TD1, TD2, etc. comme type
          const typeIndex = (index % config.subGroupsPerGroup) + 1;
          const courseType = `TD${typeIndex}` as CourseType;

          const existing = findExistingCard(matiere.code, courseType, subGroup.mainGroup, semData.semestre);
          newRows.push({
            id: existing?.id || Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: courseType,
            mainGroup: subGroup.mainGroup,
            sharedGroups: [subGroup.mainGroup],
            subLabel: subGroup.label, // TD11, TD12, etc.
            // CONSERVER l'enseignant et la salle existants si disponibles
            teacher: existing?.teacher || defaultTeachersTD.split('/')[0]?.trim() || 'Non assigné',
            room: existing?.room || defaultRoom,
            semester: semData.semestre
          });
        });

        // Créer les cours TP pour chaque sous-groupe
        allSubGroups.filter(sg => sg.type === 'TP').forEach((subGroup, index) => {
          const defaultRoom = subGroup.mainGroup === "Groupe 1" ? "Lab 1" :
            subGroup.mainGroup === "Groupe 2" ? "Lab 2" :
              subGroup.mainGroup === "Groupe 3" ? "Lab 3" : "Lab 4";

          // Utiliser TP1, TP2, etc. comme type
          const typeIndex = (index % config.subGroupsPerGroup) + 1;
          const courseType = `TP${typeIndex}` as CourseType;

          const existing = findExistingCard(matiere.code, courseType, subGroup.mainGroup, semData.semestre);
          newRows.push({
            id: existing?.id || Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: courseType,
            mainGroup: subGroup.mainGroup,
            sharedGroups: [subGroup.mainGroup],
            subLabel: subGroup.label, // TP11, TP12, etc.
            // CONSERVER l'enseignant et la salle existants si disponibles
            teacher: existing?.teacher || defaultTeachersTD.split('/')[0]?.trim() || 'Non assigné',
            room: existing?.room || defaultRoom,
            semester: semData.semestre
          });
        });
      });
    });

    setAssignmentRows(newRows);
    setToastMessage({ msg: 'Cartes rafraîchies ! Affectations des profs conservées.', type: 'success' });
  };

  // Fonction pour vider SEULEMENT le planning (schedule)
  const clearScheduleOnly = () => {
    if (!confirm('Vider seulement le planning ? (Conserve les cartes et affectations)')) return;

    setSchedule({});
    setToastMessage({ msg: 'Planning vidé ! Cartes et affectations conservées.', type: 'success' });
  };

  // Fonction de correction des sous-groupes
  const fixSubGroups = () => {
    setAssignmentRows(prev => {
      // Créer un compteur pour chaque combinaison type/matière/groupe/semestre
      const counters: Record<string, number> = {};

      return prev.map(course => {
        // D'abord, extraire le vrai type depuis le subLabel si nécessaire
        let correctedType = course.type;
        let correctedSubLabel = course.subLabel || course.type;

        // Si le subLabel contient TD ou TP, s'assurer que le type correspond
        if (course.subLabel && (course.subLabel.startsWith('TD') || course.subLabel.startsWith('TP'))) {
          if (course.subLabel.startsWith('TD')) {
            correctedType = 'TD1' as CourseType;
          } else if (course.subLabel.startsWith('TP')) {
            correctedType = 'TP1' as CourseType;
          }
        }

        // Maintenant générer le bon subLabel basé sur le type corrigé
        if (correctedType.startsWith('TD') || correctedType.startsWith('TP')) {
          const baseType = correctedType.startsWith('TD') ? 'TD' : 'TP';
          // Créer une clé unique pour ce type de cours
          const key = `${baseType}-${course.subject}-${course.mainGroup}-${course.semester}`;

          // Incrémenter le compteur pour cette combinaison
          counters[key] = (counters[key] || 0) + 1;

          const groupNumber = course.mainGroup.replace('Groupe ', '');
          correctedSubLabel = `${baseType}${groupNumber}${counters[key]}`;
        } else {
          correctedSubLabel = correctedType; // CM reste CM
        }

        return {
          ...course,
          type: correctedType as CourseType,
          subLabel: correctedSubLabel
        };
      });
    });

    setToastMessage({ msg: 'Types et labels des sous-groupes corrigés !', type: 'success' });
  };

  const loadFullDataset = (confirmAction = true) => {
    if (confirmAction && !confirm("Réinitialiser ?")) return;
    const newRows: AssignmentRow[] = [];

    // IMPORTANT: Utiliser MASTER_DB au lieu de customSubjects pour avoir les nouveaux noms abrégés
    MASTER_DB.forEach((semData: any) => {
      semData.matieres.forEach((matiere: any) => {
        // Utiliser les enseignants CM pour les cours CM
        const teachersCM = matiere.enseignantsCM || matiere.enseignants || '';
        // Utiliser les enseignants TD pour les cours TD
        const teachersTD = matiere.enseignantsTD || matiere.enseignants || '';

        // Créer les cours CM pour chaque groupe principal
        dynamicGroups.forEach(group => {
          newRows.push({
            id: Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: 'CM',
            mainGroup: group,
            sharedGroups: [group],
            subLabel: 'CM',
            teacher: teachersCM.split('/')[0]?.trim() || 'Non assigné',
            room: 'Khawarizmi',
            semester: semData.semestre
          });
        });

        // Créer les cours TD pour chaque sous-groupe
        allSubGroups.filter(sg => sg.type === 'TD').forEach((subGroup, index) => {
          const defaultRoom = subGroup.mainGroup === "Groupe 1" ? "101" :
            subGroup.mainGroup === "Groupe 2" ? "201" :
              subGroup.mainGroup === "Groupe 3" ? "202" : "203";

          // Utiliser TD1, TD2, etc. comme type
          const typeIndex = (index % config.subGroupsPerGroup) + 1;
          const courseType = `TD${typeIndex}` as CourseType;

          newRows.push({
            id: Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: courseType,
            mainGroup: subGroup.mainGroup,
            sharedGroups: [subGroup.mainGroup],
            subLabel: subGroup.label, // TD11, TD12, etc.
            teacher: teachersTD.split('/')[0]?.trim() || 'Non assigné',
            room: defaultRoom,
            semester: semData.semestre
          });
        });

        // Créer les cours TP pour chaque sous-groupe
        allSubGroups.filter(sg => sg.type === 'TP').forEach((subGroup, index) => {
          const defaultRoom = subGroup.mainGroup === "Groupe 1" ? "Lab 1" :
            subGroup.mainGroup === "Groupe 2" ? "Lab 2" :
              subGroup.mainGroup === "Groupe 3" ? "Lab 3" : "Lab 4";

          // Utiliser TP1, TP2, etc. comme type
          const typeIndex = (index % config.subGroupsPerGroup) + 1;
          const courseType = `TP${typeIndex}` as CourseType;

          newRows.push({
            id: Math.random().toString(36).substr(2, 9),
            subject: matiere.code,
            subjectLabel: matiere.libelle,
            type: courseType,
            mainGroup: subGroup.mainGroup,
            sharedGroups: [subGroup.mainGroup],
            subLabel: subGroup.label, // TP11, TP12, etc.
            teacher: teachersTD.split('/')[0]?.trim() || 'Non assigné',
            room: defaultRoom,
            semester: semData.semestre
          });
        });
      });
    });

    // Réinitialiser aussi customSubjects avec les nouvelles données de MASTER_DB
    const updatedCustomSubjects = JSON.parse(JSON.stringify(MASTER_DB)).map((semester: any) => ({
      ...semester,
      matieres: semester.matieres.map((matiere: any) => ({
        ...matiere,
        enseignantsCM: matiere.enseignantsCM || matiere.enseignants,
        enseignantsTD: matiere.enseignantsTD || matiere.enseignants
      }))
    }));

    setCustomSubjects(updatedCustomSubjects);
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

        // Interdire les sous-groupes du même numéro d'être en parallèle
        // TD11 ne peut pas être avec TP11, mais TD11 peut être avec TP12
        if (draggingCourse.subLabel && existingCourse.subLabel) {
          const draggingSubGroup = draggingCourse.subLabel;
          const existingSubGroup = existingCourse.subLabel;

          console.log('🔍 DEBUG CONFLIT SOUS-GROUPE:', {
            dragging: { id: draggingCourse.id, subLabel: draggingSubGroup, type: draggingCourse.type },
            existing: { id: existingCourse.id, subLabel: existingSubGroup, type: existingCourse.type }
          });

          // Extraire le numéro de sous-groupe (ex: TD11 → 11, TP12 → 12)
          const draggingMatch = draggingSubGroup.match(/^(TD|TP)(\d+)$/);
          const existingMatch = existingSubGroup.match(/^(TD|TP)(\d+)$/);

          console.log('🔍 DEBUG REGEX MATCH:', {
            draggingMatch,
            existingMatch
          });

          if (draggingMatch && existingMatch) {
            const draggingSubNumber = draggingMatch[2]; // "11", "12", etc.
            const existingSubNumber = existingMatch[2]; // "11", "12", etc.

            console.log('🔍 DEBUG COMPARAISON:', {
              draggingSubNumber,
              existingSubNumber,
              sameNumber: draggingSubNumber === existingSubNumber,
              differentTypes: draggingMatch[1] !== existingMatch[1]
            });

            // Si même numéro de sous-groupe ET types différents (TD vs TP)
            if (draggingSubNumber === existingSubNumber && draggingMatch[1] !== existingMatch[1]) {
              console.log('🚨 CONFLIT DÉTECTÉ!');
              return `CONFLIT SOUS-GROUPE : ${draggingSubGroup} ne peut pas être en parallèle avec ${existingSubGroup} (même numéro de sous-groupe)`;
            }

            // Si exactement le même sous-groupe (TD11 avec TD11, TP11 avec TP11)
            if (draggingSubNumber === existingSubNumber && draggingMatch[1] === existingMatch[1]) {
              console.log('🚨 CONFLIT MÊME SOUS-GROUPE DÉTECTÉ!');
              return `CONFLIT SOUS-GROUPE : ${draggingSubGroup} ne peut pas être en parallèle avec un autre ${existingSubGroup} (même sous-groupe)`;
            }
          }
        }
      }
    }

    // NOUVEAU : Vérifier aussi les conflits de sous-groupes dans TOUS les groupes du même niveau
    // (pas seulement les groupes "similaires")
    for (const group of dynamicGroups) {
      // Vérifier seulement si c'est le même groupe principal que le cours qu'on déplace
      if (group !== draggingCourse.mainGroup) continue;

      const currentSlotKey = `${semester}|w${currentWeek}|${group}|${day}|${time}`;
      const existingLocalValue = schedule[currentSlotKey];
      const existingLocalIds = Array.isArray(existingLocalValue) ? existingLocalValue : (existingLocalValue ? [existingLocalValue] : []);

      // Si le cours est déjà dans ce créneau, permettre le déplacement/remplacement
      if (existingLocalIds.includes(courseId as string)) {
        continue;
      }

      // Vérifier les conflits de sous-groupes avec TOUS les cours du créneau
      for (const existingCourseId of existingLocalIds) {
        const existingCourse = assignmentRows.find(r => r.id === existingCourseId);
        if (!existingCourse) continue;

        // Vérification spéciale pour les sous-groupes (même si pas "similaires")
        if (draggingCourse.subLabel && existingCourse.subLabel) {
          const draggingSubGroup = draggingCourse.subLabel;
          const existingSubGroup = existingCourse.subLabel;

          console.log('🔍 DEBUG CONFLIT SOUS-GROUPE (GLOBAL):', {
            dragging: { id: draggingCourse.id, subLabel: draggingSubGroup, type: draggingCourse.type, mainGroup: draggingCourse.mainGroup },
            existing: { id: existingCourse.id, subLabel: existingSubGroup, type: existingCourse.type, mainGroup: existingCourse.mainGroup }
          });

          // Extraire le numéro de sous-groupe (ex: TD11 → 11, TP12 → 12)
          const draggingMatch = draggingSubGroup.match(/^(TD|TP)(\d+)$/);
          const existingMatch = existingSubGroup.match(/^(TD|TP)(\d+)$/);

          if (draggingMatch && existingMatch) {
            const draggingSubNumber = draggingMatch[2]; // "11", "12", etc.
            const existingSubNumber = existingMatch[2]; // "11", "12", etc.

            console.log('🔍 DEBUG COMPARAISON (GLOBAL):', {
              draggingSubNumber,
              existingSubNumber,
              sameNumber: draggingSubNumber === existingSubNumber,
              differentTypes: draggingMatch[1] !== existingMatch[1]
            });

            // Si même numéro de sous-groupe ET types différents (TD vs TP)
            if (draggingSubNumber === existingSubNumber && draggingMatch[1] !== existingMatch[1]) {
              console.log('🚨 CONFLIT SOUS-GROUPE DÉTECTÉ (GLOBAL)!');
              return `CONFLIT SOUS-GROUPE : ${draggingSubGroup} ne peut pas être en parallèle avec ${existingSubGroup} (même numéro de sous-groupe)`;
            }

            // Si exactement le même sous-groupe (TD11 avec TD11, TP11 avec TP11)
            if (draggingSubNumber === existingSubNumber && draggingMatch[1] === existingMatch[1]) {
              console.log('🚨 CONFLIT MÊME SOUS-GROUPE DÉTECTÉ (GLOBAL)!');
              return `CONFLIT SOUS-GROUPE : ${draggingSubGroup} ne peut pas être en parallèle avec un autre ${existingSubGroup} (même sous-groupe)`;
            }
          }
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

  // --- HEADER BANNER (déplacé en dehors du composant App) ---


  // Fonction pour sauvegarder en base de données
  // Fonction pour sauvegarder en base de données (Complète)
  const handleSaveToDatabase = async () => {
    if (!currentUser) {
      setToastMessage({ msg: 'Vous devez être connecté pour sauvegarder', type: 'error' });
      return;
    }

    try {
      const allData = {
        assignment_rows: assignmentRows,
        schedule: schedule,
        config: config,
        custom_rooms: customRooms,
        custom_subjects: customSubjects
      };

      // Sauvegarder tout en une fois
      const response = await fetch('/api/timetable/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.username,
          allData: allData
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage({
          msg: data.message || 'Sauvegarde Cloud réussie !',
          type: 'success'
        });
      } else {
        setToastMessage({
          msg: 'Erreur: ' + (data.message || 'Échec de sauvegarde'),
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setToastMessage({ msg: 'Erreur de connexion lors de la sauvegarde', type: 'error' });
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
        console.log('Données chargées depuis la base de données:', data);

        // Charger toutes les données si disponibles
        if (data.assignment_rows) setAssignmentRows(data.assignment_rows);
        if (data.schedule) setSchedule(data.schedule);
        if (data.config) setConfig(data.config);
        if (data.custom_rooms) setCustomRooms(data.custom_rooms);
        if (data.custom_subjects) setCustomSubjects(data.custom_subjects);

        const sourceLabel = result.sourceUser === 'admin' ? 'l\'administrateur' : 'votre profil';
        setToastMessage({
          msg: `Données chargées depuis ${sourceLabel}`,
          type: 'success'
        });
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
    setAssignmentRows(prev => prev.map((r: AssignmentRow) => {
      if (r.id === id) {
        let updatedRow = { ...r, [field]: value };

        // Si on change le type, mettre à jour le subLabel approprié
        if (field === 'type') {
          const newType = value as CourseType;

          if (newType === 'CM') {
            updatedRow.subLabel = 'CM';
          } else if (newType.startsWith('TD') || newType.startsWith('TP')) {
            // Extraire le type de base et le numéro de sous-groupe
            const baseType = newType.startsWith('TD') ? 'TD' : 'TP';
            const subGroupNumber = newType.slice(2); // '1', '2', '3', '4'

            // Générer le subLabel selon le groupe principal
            const groupNumber = r.mainGroup.replace('Groupe ', '');
            updatedRow.subLabel = `${baseType}${groupNumber}${subGroupNumber}`;
          }
        }

        // Gestion spéciale pour mainGroup - régénérer le subLabel si nécessaire
        if (field === 'mainGroup') {
          updatedRow.sharedGroups = [value];

          // Si c'est un TD ou TP, régénérer le subLabel avec le nouveau groupe
          if (r.type.startsWith('TD') || r.type.startsWith('TP')) {
            const baseType = r.type.startsWith('TD') ? 'TD' : 'TP';
            const subGroupNumber = r.type.slice(2);
            const newGroupNumber = value.replace('Groupe ', '');
            updatedRow.subLabel = `${baseType}${newGroupNumber}${subGroupNumber}`;
          }
        }

        return updatedRow;
      }
      return r;
    }));
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

  const gridTemplate = `24px repeat(${config.timeSlots.length}, minmax(300px, 1fr))`;
  const gridBaseClasses = "grid w-full";

  // Show login screen if not authenticated
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div id="export-container" className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden relative" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: landscape; margin: 2mm; }
          body { -webkit-print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          
          /* Débloquer le scroll pour tout voir */
          .overflow-auto, .overflow-y-auto, .overflow-x-auto, .overflow-hidden { overflow: visible !important; height: auto !important; }
          
          /* Utiliser le zoom pour faire tenir tout le planning en largeur sans déformer les cellules */
          /* On conserve les proportions "réelles" des cartes (300px) mais on réduit moins (0.7) grâce aux marges réduites */
          .print-layout-fix {
             zoom: 0.7 !important;
             width: max-content !important; /* Force la largeur totale pour éviter la compression */
             min-width: 100% !important;
             display: grid !important; /* Garder la grille */
          }
          
          /* Empêcher la coupure des jours au milieu d'une page */
          .container-export-rows > div {
             break-inside: avoid;
             page-break-inside: avoid;
          }
          
          /* Empêcher la déformation : les colonnes fixes ne doivent jamais rétrécir */
          .w-12, .w-16, .w-24 { flex-shrink: 0 !important; }
          
          /* Supprimer l'espace vide en bas : hauteur automatique */
          .h-screen { height: auto !important; min-height: 0 !important; }
          #export-container { height: auto !important; }
          
          /* Cacher explicitement les zones de scroll inutiles */
          .data-menu-container, .sidebar-container { display: none !important; }
       }
      `}} />
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
          semester={semester} setSemester={handleSemesterChange}
          group={activeMainGroup} setGroup={handleGroupChange}
          week={currentWeek} setWeek={handleWeekChange}
          totalWeeks={config.totalWeeks}
          startStr={weekDates.startStr} endStr={weekDates.endStr}
          searchQuery={searchQuery} handleSearchChange={handleSearchChange}
          searchInputRef={searchInputRef}
          dynamicGroups={dynamicGroups}
          config={config}
          handleSaveToDatabase={handleSaveToDatabase}
          handlePrint={handlePrint}
          setCurrentUser={setCurrentUser}
          currentUser={currentUser}
          loadFullDataset={loadFullDataset}
          assignmentRows={assignmentRows}
          isClient={isClient}
          activeMainGroup={activeMainGroup}
          diagnoseCourses={diagnoseCourses}
          migrateToNewSystem={migrateToNewSystem}
          refreshCardsOnly={refreshCardsOnly}
          clearScheduleOnly={clearScheduleOnly}
          fixSubGroups={fixSubGroups}
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
                        {sidebarCourses.map((c, idx) => <DraggableCard key={`${c.id}-${refreshKey}-${idx}`} course={c} searchQuery={searchQuery} compact customSubjects={customSubjects} schedule={schedule} assignmentRows={assignmentRows} />)}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 p-1 bg-slate-200 overflow-hidden flex flex-col min-h-0 planning-container">
                    <div id="calendar-capture-zone" className="flex-1 bg-white rounded-lg shadow border border-slate-300 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div style={{ gridTemplateColumns: gridTemplate, backgroundColor: 'white', minWidth: '800px' }} className={`${gridBaseClasses} sticky top-0 z-20 print-layout-fix`}>
                        <div className="p-1 text-center text-[10px] font-bold text-gray-800 bg-white border border-black"></div>
                        {config.timeSlots.map((t, index) => (
                          <div key={t} className={`p-1 text-center text-xs font-black text-gray-800 uppercase border border-black ${index < config.timeSlots.length - 1 ? 'mr-1' : ''}`} style={{ backgroundColor: '#c4d79b', fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
                            {t}
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 flex flex-col items-stretch bg-slate-50/30 gap-1 min-h-0 container-export-rows">
                        {DAYS.map((day, dayIndex) => (
                          <div key={day} className={dayIndex > 0 && (day === 'Mercredi' || day === 'Jeudi') ? 'mt-4' : ''}>
                            <div style={{ gridTemplateColumns: gridTemplate, minWidth: '800px' }} className={`${gridBaseClasses} w-full bg-white items-stretch overflow-visible h-auto flex-1 export-row print-layout-fix`}>
                              <div className="bg-white flex items-center justify-center py-1 overflow-visible h-auto border border-black" style={{ backgroundColor: '#c4d79b', fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
                                <span className="inline-block font-black text-gray-800 text-[11px] -rotate-90 uppercase tracking-widest leading-none whitespace-nowrap">{day}</span>
                              </div>
                              {config.timeSlots.map(time => {
                                const slotKey = `${semester}|w${currentWeek}|${activeMainGroup}|${day}|${time}`;
                                const courseValue = schedule[slotKey];
                                // Normaliser la valeur (gérer les cas string | null | string[])
                                const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                const combinedCourse = getCombinedCourseInfo(courseIds);
                                return (
                                  <div key={time} className="p-1 relative flex items-stretch mr-1 last:mr-0">
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
                        r.semester === semester &&
                        (
                          r.subject.toLowerCase().includes(manageFilterCode.toLowerCase()) ||
                          r.mainGroup.toLowerCase().includes(manageFilterCode.toLowerCase()) ||
                          (SUBJECT_NAMES[r.subject] || r.subjectLabel || '').toLowerCase().includes(manageFilterCode.toLowerCase()) ||
                          (r.teacher || '').toLowerCase().includes(manageFilterCode.toLowerCase())
                        )
                      ).sort((a, b) => {
                        // Trier par groupe puis par matière
                        if (a.mainGroup !== b.mainGroup) return a.mainGroup.localeCompare(b.mainGroup);
                        return a.subject.localeCompare(b.subject);
                      }).map((row, rowIdx) => {
                        return (
                          <tr key={`${row.id}-${rowIdx}`} className="hover:bg-slate-50 transition-colors group">
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
                                <option value="CM">CM</option>
                                <option value="TD1">TD1</option>
                                <option value="TD2">TD2</option>
                                <option value="TD3">TD3</option>
                                <option value="TD4">TD4</option>
                                <option value="TP1">TP1</option>
                                <option value="TP2">TP2</option>
                                <option value="TP3">TP3</option>
                                <option value="TP4">TP4</option>
                              </select>
                            </td>
                            <td className="p-1 border-r border-slate-50">
                              <div className="flex gap-2 items-center">
                                {/* Sélecteur d'enseignant */}
                                <select
                                  key={`teacher-select-${row.id}-${refreshKey}`}
                                  value={row.teacher || (() => {
                                    // Valeur par défaut : premier enseignant disponible pour cette matière
                                    const semesterData = customSubjects.find((s: any) => s.semestre === row.semester);
                                    const matiereData = semesterData?.matieres.find((m: any) => m.code === row.subject);
                                    let assignedTeachers: string[] = [];
                                    if (row.type === 'CM') {
                                      assignedTeachers = (matiereData?.enseignantsCM || matiereData?.enseignants || '').split('/').map((t: string) => t.trim()).filter((t: string) => t && t !== '?');
                                    } else {
                                      assignedTeachers = (matiereData?.enseignantsTD || matiereData?.enseignants || '').split('/').map((t: string) => t.trim()).filter((t: string) => t && t !== '?');
                                    }
                                    return assignedTeachers[0] || 'Non assigné';
                                  })()}
                                  onChange={(e) => {
                                    // Logique simplifiée : remplacer directement la valeur
                                    updateRow(row.id, 'teacher', e.target.value);
                                    setRefreshKey(prev => prev + 1); // Forcer le re-rendu des cartes
                                  }}
                                  className="flex-1 border border-slate-200 rounded px-2 py-1 bg-white text-[10px] font-bold outline-none focus:ring-1 ring-green-300 shadow-sm"
                                >
                                  {/* Enseignants affectés à cette matière */}
                                  {(() => {
                                    const semesterData = customSubjects.find((s: any) => s.semestre === row.semester);
                                    const matiereData = semesterData?.matieres.find((m: any) => m.code === row.subject);

                                    // Utiliser les enseignants appropriés selon le type de cours
                                    let assignedTeachers: string[] = [];
                                    if (row.type === 'CM') {
                                      assignedTeachers = (matiereData?.enseignantsCM || matiereData?.enseignants || '').split('/').map((t: string) => t.trim()).filter((t: string) => t && t !== '?');
                                    } else {
                                      assignedTeachers = (matiereData?.enseignantsTD || matiereData?.enseignants || '').split('/').map((t: string) => t.trim()).filter((t: string) => t && t !== '?');
                                    }

                                    // Si aucun enseignant assigné, afficher une option par défaut
                                    if (assignedTeachers.length === 0) {
                                      return [<option key="default" value="Non assigné">Non assigné</option>];
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
                                      setCustomSubjects((prev: any) => {
                                        const newSubjects = [...prev];
                                        const semesterIndex = newSubjects.findIndex((s: any) => s.semestre === row.semester);
                                        if (semesterIndex !== -1) {
                                          const matiereIndex = newSubjects[semesterIndex].matieres.findIndex((m: any) => m.code === row.subject);
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
                                  value={row.room || (() => {
                                    // Salle par défaut selon le type de cours et le groupe
                                    if (row.type === 'CM') {
                                      return 'Khawarizmi';
                                    } else if (row.type.startsWith('TP')) {
                                      return row.mainGroup === "Groupe 1" ? "Lab 1" :
                                        row.mainGroup === "Groupe 2" ? "Lab 2" :
                                          row.mainGroup === "Groupe 3" ? "Lab 3" : "Lab 4";
                                    } else {
                                      return row.mainGroup === "Groupe 1" ? "101" :
                                        row.mainGroup === "Groupe 2" ? "201" :
                                          row.mainGroup === "Groupe 3" ? "202" : "203";
                                    }
                                  })()}
                                  onChange={(e) => {
                                    updateRow(row.id, 'room', e.target.value);
                                    setRefreshKey(prev => prev + 1); // Forcer le re-rendu des cartes
                                  }}
                                  className="w-20 border border-slate-200 rounded px-2 py-1 bg-white font-mono font-bold text-[10px] outline-none focus:ring-1 ring-green-300 shadow-sm text-center"
                                >
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
                                    // Déterminer le type de la nouvelle ligne selon le nouveau système
                                    let newType: CourseType = 'CM';

                                    if (row.type === 'CM') {
                                      newType = 'TD1'; // CM → TD1
                                    } else if (row.type.startsWith('TD')) {
                                      // TD1 → TP1, TD2 → TP2, etc.
                                      const subGroupNumber = row.type.slice(2);
                                      const tpType = `TP${subGroupNumber}`;
                                      // Ensure it's a valid CourseType
                                      if (['TP1', 'TP2', 'TP3', 'TP4'].includes(tpType)) {
                                        newType = tpType as CourseType;
                                      } else {
                                        newType = 'TP1';
                                      }
                                    } else if (row.type.startsWith('TP')) {
                                      // TP1 → TD1, TP2 → TD2, etc. (cycle)
                                      const subGroupNumber = row.type.slice(2);
                                      const tdType = `TD${subGroupNumber}`;
                                      // Ensure it's a valid CourseType
                                      if (['TD1', 'TD2', 'TD3', 'TD4'].includes(tdType)) {
                                        newType = tdType as CourseType;
                                      } else {
                                        newType = 'TD1';
                                      }
                                    }

                                    // Générer le subLabel approprié
                                    let newSubLabel: string = newType;
                                    let defaultRoom = '101';

                                    if (newType.startsWith('TD') || newType.startsWith('TP')) {
                                      const baseType = newType.startsWith('TD') ? 'TD' : 'TP';
                                      const subGroupNumber = newType.slice(2);
                                      const groupNumber = row.mainGroup.replace('Groupe ', '');
                                      newSubLabel = `${baseType}${groupNumber}${subGroupNumber}`;

                                      // Définir une salle par défaut selon le groupe et le type
                                      if (baseType.startsWith('TP')) {
                                        defaultRoom = row.mainGroup === "Groupe 1" ? "Lab 1" :
                                          row.mainGroup === "Groupe 2" ? "Lab 2" :
                                            row.mainGroup === "Groupe 3" ? "Lab 3" : "Lab 4";
                                      } else {
                                        defaultRoom = row.mainGroup === "Groupe 1" ? "101" :
                                          row.mainGroup === "Groupe 2" ? "201" :
                                            row.mainGroup === "Groupe 3" ? "202" : "203";
                                      }
                                    }

                                    const newRow: AssignmentRow = {
                                      id: 'new-' + Date.now(),
                                      subject: row.subject,
                                      subjectLabel: row.subjectLabel,
                                      type: newType,
                                      mainGroup: row.mainGroup,
                                      sharedGroups: [row.mainGroup],
                                      subLabel: newSubLabel,
                                      teacher: row.teacher || 'Non assigné',
                                      room: newType === 'CM' ? 'Khawarizmi' : defaultRoom,
                                      semester: row.semester
                                    };

                                    // Trouver l'index de la ligne actuelle dans le tableau complet
                                    const currentRowIndex = assignmentRows.findIndex(r => r.id === row.id);

                                    // Insérer la nouvelle ligne juste après la ligne actuelle
                                    setAssignmentRows(prev => {
                                      const newRows = [...prev];
                                      newRows.splice(currentRowIndex + 1, 0, newRow);
                                      return newRows;
                                    });

                                    setToastMessage({ msg: `Nouvelle ligne ${newSubLabel} ajoutée pour ${row.subject}`, type: 'success' });
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
                        .filter((semestre: any) => !dataFilterSemester || semestre.semestre === dataFilterSemester)
                        .map((semestre: any, semIdx: number) => (
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

                                // Créer automatiquement les cartes pour tous les groupes (CM, TD1, TD2, TP1, TP2)
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
                                    room: 'Khawarizmi',
                                    semester: semestre.semestre
                                  });

                                  const groupNum = group.replace('Groupe ', '');

                                  // Lignes TD (1 et 2)
                                  [1, 2].forEach(num => {
                                    const defaultRoom = group === "Groupe 1" ? "101" : group === "Groupe 2" ? "201" : group === "Groupe 3" ? "202" : "203";
                                    newCourses.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      subject: newMatiere.code,
                                      subjectLabel: newMatiere.libelle,
                                      type: `TD${num}` as CourseType,
                                      mainGroup: group,
                                      sharedGroups: [group],
                                      subLabel: `TD${groupNum}${num}`,
                                      teacher: newMatiere.enseignantsTD.split('/')[0]?.trim() || '',
                                      room: defaultRoom,
                                      semester: semestre.semestre
                                    });
                                  });

                                  // Lignes TP (1 et 2)
                                  [1, 2].forEach(num => {
                                    const tpRoom = group === "Groupe 1" ? "Lab 1" : group === "Groupe 2" ? "Lab 2" : group === "Groupe 3" ? "Lab 3" : "Lab 4";
                                    newCourses.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      subject: newMatiere.code,
                                      subjectLabel: newMatiere.libelle,
                                      type: `TP${num}` as CourseType,
                                      mainGroup: group,
                                      sharedGroups: [group],
                                      subLabel: `TP${groupNum}${num}`,
                                      teacher: newMatiere.enseignantsTD.split('/')[0]?.trim() || '',
                                      room: tpRoom,
                                      semester: semestre.semestre
                                    });
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
                                .filter((matiere: any) => !dataFilterSubject ||
                                  matiere.code.toLowerCase().includes(dataFilterSubject.toLowerCase()) ||
                                  matiere.libelle.toLowerCase().includes(dataFilterSubject.toLowerCase())
                                )
                                .map((matiere: any, matIdx: number) => (
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
                          .filter((semestre: any) => !dataFilterSemester || semestre.semestre === dataFilterSemester)
                          .map((semestre: any, semIdx: number) => (
                            <div key={semIdx} className="border border-slate-100 rounded-lg p-4 bg-slate-50">
                              <h4 className="font-bold text-lg text-blue-700 mb-3">{semestre.semestre}</h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {semestre.matieres.map((matiere: any, matIdx: number) => {
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
                                              else if (scheduledCourse.type.startsWith('TD')) tdSessions++;
                                              else if (scheduledCourse.type.startsWith('TP')) tpSessions++;
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sous-groupes TD/TP par groupe</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={config.subGroupsPerGroup || 2}
                          onChange={(e) => setConfig({ ...config, subGroupsPerGroup: parseInt(e.target.value) || 2 })}
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-100"
                        />
                        <p className="text-xs text-slate-500 mt-1">Ex: 2 → TD11, TD12, TP11, TP12 pour le Groupe 1</p>
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
                      onClick={() => {
                        if (!confirm("Attention : Cela va écraser vos données actuelles avec la dernière sauvegarde serveur. Continuer ?")) return;

                        fetch('/api/timetable/load?userId=admin')
                          .then(res => res.json())
                          .then(data => {
                            if (data.success && data.data) {
                              const serverData = data.data;

                              if (serverData.assignment_rows) {
                                setAssignmentRows(serverData.assignment_rows);
                                localStorage.setItem('supnum_assignment_rows', JSON.stringify(serverData.assignment_rows));
                              }

                              if (serverData.schedule) {
                                setSchedule(serverData.schedule);
                                localStorage.setItem('supnum_schedule', JSON.stringify(serverData.schedule));
                              }

                              if (serverData.custom_rooms) {
                                setCustomRooms(serverData.custom_rooms);
                                localStorage.setItem('supnum_custom_rooms', JSON.stringify(serverData.custom_rooms));
                              } else {
                                // Reset to default rooms if not in server data
                                setCustomRooms(ALL_ROOMS);
                                localStorage.setItem('supnum_custom_rooms', JSON.stringify(ALL_ROOMS));
                              }

                              if (serverData.custom_subjects) {
                                setCustomSubjects(serverData.custom_subjects);
                                localStorage.setItem('supnum_custom_subjects', JSON.stringify(serverData.custom_subjects));
                              } else {
                                // Reset to default subjects (MASTER_DB) if not in server data
                                setCustomSubjects(MASTER_DB);
                                localStorage.setItem('supnum_custom_subjects', JSON.stringify(MASTER_DB));
                              }

                              setToastMessage({ msg: "Données récupérées du serveur avec succès !", type: 'success' });
                            } else {
                              setToastMessage({ msg: "Erreur lors de la récupération : " + (data.message || "Inconnue"), type: 'error' });
                            }
                          })
                          .catch(err => {
                            console.error(err);
                            setToastMessage({ msg: "Erreur réseau lors de la récupération", type: 'error' });
                          });
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold transition-colors flex items-center gap-2"
                      title="Récupérer les données sauvegardées sur le serveur"
                    >
                      <Database size={18} />
                      Charger depuis le serveur
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 italic">
                    "Exporter Backup" crée un fichier .json local. "Sauvegarder dans le fichier" met à jour le code source. "Charger depuis le serveur" récupère les données de timetable.json.
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
      className={`w-full h-full h-auto transition-colors flex flex-col ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10' : ''
        }`}
    >
      {isEmpty ? (
        // Tableau vide avec structure visible en gris
        <div className="w-full h-full border border-gray-300 bg-slate-50 flex flex-col">
          {/* Première ligne du tableau vide */}
          <div className="flex h-6 border-b border-gray-300">
            <div className="flex-1 border-r border-gray-300"></div>
            <div className="w-12 border-r border-gray-300"></div>
            <div className="w-12"></div>
          </div>
          {/* Deuxième ligne du tableau vide */}
          <div className="flex-1 border-b border-gray-300"></div>
          {/* Troisième ligne du tableau vide */}
          <div className="h-6"></div>
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
      <div className="flex min-h-[1.75rem] border-b border-black">
        <div className="flex-1 px-1 py-0.5 border-r border-black flex items-center bg-white overflow-hidden">
          <span className="font-bold text-xs text-black text-left w-full whitespace-normal break-words leading-tight pl-1">{course.subject}</span>
        </div>
        <div className="w-16 px-1 py-0.5 border-r border-black flex items-center justify-center bg-white overflow-hidden">
          <span className="font-bold text-[10px] text-black text-center whitespace-normal break-words leading-tight">
            {course.subLabel || (() => {
              const groupNum = (course.mainGroup || '').replace(/[^0-9]/g, '');
              const typeLetters = (course.type || '').replace(/[0-9]/g, '');
              const typeNum = (course.type || '').replace(/[^0-9]/g, '');
              if (typeLetters === 'CM') return 'CM';
              if (groupNum && typeNum) return `${typeLetters}${groupNum}${typeNum}`;
              return course.type;
            })()}
          </span>
        </div>
        <div className="w-24 px-1 py-0.5 flex items-center bg-white overflow-hidden">
          <span className="font-bold text-[10px] text-black text-left w-full whitespace-normal break-words leading-tight pl-1">{(() => {
            const rooms = (course.room || '').split('/').map((s: string) => s.trim()).filter((s: string) => s && s !== '?').join('/');
            return rooms || '?';
          })()}</span>
        </div>
      </div>

      {/* Deuxième ligne du tableau : Nom complet de la matière */}
      <div className="flex-1 px-1 py-0.5 border-b border-black flex items-center bg-white overflow-hidden">
        <span className="text-xs text-black font-bold text-left w-full whitespace-normal break-words leading-tight pl-1">{course.subjectLabel || course.subject}</span>
      </div>

      {/* Troisième ligne du tableau : Enseignant */}
      <div className="min-h-[1.75rem] px-1 py-0.5 flex items-center bg-white overflow-hidden">
        <span className="text-xs font-bold text-red-600 text-left w-full whitespace-normal break-words leading-tight pl-1">{(() => {
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

  // Déterminer le type de base (CM, TD, TP)
  let baseType = type;
  if (typeof type === 'string') {
    if (type.startsWith('TD')) baseType = 'TD';
    else if (type.startsWith('TP')) baseType = 'TP';
    else if (type === 'CM') baseType = 'CM';
  }

  switch (baseType) {
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
      <div onClick={() => setIsModalOpen(true)} className={`${className} cursor-pointer h-auto p-1.5 flex flex-wrap gap-1 items-start bg-white border border-slate-300 rounded overflow-hidden hover:border-blue-400 transition-all group`}>
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



