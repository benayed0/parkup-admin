export type OperatorRole = 'super_admin' | 'admin' | 'manager' | 'supervisor';

export interface PopulatedZone {
  _id: string;
  code: string;
  name: string;
}

export interface Operator {
  _id: string;
  email: string;
  name: string;
  role: OperatorRole;
  zoneIds: (string | PopulatedZone)[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<OperatorRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Superviseur',
};

export const ROLE_HIERARCHY: Record<OperatorRole, number> = {
  super_admin: 100,
  admin: 75,
  manager: 50,
  supervisor: 25,
};
