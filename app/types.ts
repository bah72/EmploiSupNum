export type CourseType = 'CM' | 'TD1' | 'TD2' | 'TD3' | 'TD4' | 'TP1' | 'TP2' | 'TP3' | 'TP4';

export type UserRole = 'admin' | 'prof' | 'student';

export type User = {
  id: string;
  username: string;
  role: UserRole;
  name?: string;
  email?: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
};

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
