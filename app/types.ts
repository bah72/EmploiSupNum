export type CourseType = 'CM' | 'TD' | 'TP';

export type UserRole = 'admin' | 'student';

export type User = {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name?: string;
  isActive?: boolean;
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
