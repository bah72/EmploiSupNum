import { useState, useEffect, useMemo, useCallback } from 'react';
import { AssignmentRow } from '../types';

export const useScheduleData = () => {
  const [isClient, setIsClient] = useState(false);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
  const [schedule, setSchedule] = useState<Record<string, string | null>>({});
  const [customSubjects, setCustomSubjects] = useState<any[]>([]);
  const [customRooms, setCustomRooms] = useState<string[]>([]);
  const [config, setConfig] = useState({
    startDate: '2024-09-02',
    totalWeeks: 16,
    numberOfGroups: 4,
    vacationPeriods: [] as Array<{startDate: string, endDate: string}>,
    timeSlots: ['08:00-09:30', '09:45-11:15', '11:30-13:00', '14:00-15:30', '15:45-17:15']
  });

  // Initialisation côté client avec debounce pour localStorage
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
        if (savedAssignmentRows) setAssignmentRows(JSON.parse(savedAssignmentRows));
        
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

  // Calculs mémorisés
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

  return {
    isClient,
    assignmentRows,
    setAssignmentRows,
    schedule,
    setSchedule,
    customSubjects,
    setCustomSubjects,
    customRooms,
    setCustomRooms,
    config,
    setConfig,
    uniqueTeachers,
    subjectNames,
    dynamicGroups
  };
};