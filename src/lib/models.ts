import { UserRole } from './auth-utils';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface College {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  createdAt: string;
  updatedAt: string;
}

// College options for dropdown
export const collegeOptions = [
  { id: "IIT Delhi", name: "Indian Institute of Technology, Delhi" },
  { id: "IIT Bombay", name: "Indian Institute of Technology, Bombay" },
  { id: "DTU", name: "Delhi Technological University" },
  { id: "NSUT", name: "NSUT Delhi" },
  { id: "IIIT Delhi", name: "IIIT Delhi" }
];

// Branch options for dropdown
export const branchOptions = [
  { id: "CSE", name: "Computer Science" },
  { id: "ECE", name: "Electronics & Communication" },
  { id: "ME", name: "Mechanical Engineering" },
  { id: "CE", name: "Civil Engineering" },
  { id: "EE", name: "Electrical Engineering" }
];

// Year options for dropdown
export const yearOptions = [
  { id: "1", name: "1st Year" },
  { id: "2", name: "2nd Year" },
  { id: "3", name: "3rd Year" },
  { id: "4", name: "4th Year" }
]; 