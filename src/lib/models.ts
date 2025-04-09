import { UserRole } from './auth-utils';
import { type Timestamp } from "firebase/firestore";
import type { College } from "./utils/colleges";

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

export const collegeOptions = async () => {
  const { getAllColleges } = await import("./utils/colleges");
  const colleges = await getAllColleges();
  return colleges.map((college) => ({
    id: college.id,
    name: college.name,
  }));
};

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