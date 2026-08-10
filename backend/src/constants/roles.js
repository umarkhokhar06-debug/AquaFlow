// Single source of truth for user roles, so the role list is defined once
// instead of being hand-duplicated across the model, guards, and services.

const ALL_ROLES = [
  'customer',
  'driver',
  'admin',
  'dispatcher',
  'call_center_agent',
  'technician',
  'super_admin'
];

// Roles that must NOT be reachable via public self-registration.
const STAFF_ROLES = ['admin', 'super_admin', 'dispatcher', 'call_center_agent', 'technician'];

// Roles allowed to publicly self-register via POST /api/auth/register.
const PUBLIC_SELF_REGISTERABLE_ROLES = ['customer', 'driver'];

// Roles with admin-level route access (super_admin inherits everything admin has).
const ADMIN_TIER_ROLES = ['admin', 'super_admin'];

// Roles an admin/super_admin can create via the employee-creation endpoint.
const EMPLOYEE_CREATABLE_ROLES = STAFF_ROLES;

module.exports = {
  ALL_ROLES,
  STAFF_ROLES,
  PUBLIC_SELF_REGISTERABLE_ROLES,
  ADMIN_TIER_ROLES,
  EMPLOYEE_CREATABLE_ROLES
};
