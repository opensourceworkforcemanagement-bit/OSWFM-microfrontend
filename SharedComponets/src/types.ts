export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  hours: number;
  date: string; // ISO date
}
