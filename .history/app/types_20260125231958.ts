export type CourseType = 'CM' | 'TD' | 'TP';

export type AssignmentRow = {
  id: string;
  subject: string;
  subjectLabel?: string;
  type: CourseType;
  mainGroup: string;
  sharedGroups: string[];
  subLabel: string;
  teacher: string;
  room: string;
  semester: string;
};
