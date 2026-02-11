import type { User } from '../data/types';

export type UserRole = User['role'];

// Trial users get full access — they're testing the complete platform
export function effectiveRole(user: User): UserRole {
  if (user.plan === 'trial') return 'admin';
  return user.role;
}

export const routePermissions: Record<string, UserRole[]> = {
  '/':             ['admin', 'manager', 'seller'],
  '/contacts':     ['admin', 'manager', 'seller'],
  '/contacts/:id': ['admin', 'manager', 'seller'],
  '/pipeline':     ['admin', 'manager', 'seller'],
  '/tasks':        ['admin', 'manager', 'seller'],
  '/emails':       ['admin', 'manager', 'seller'],
  '/channels':     ['admin', 'manager', 'seller'],
  '/activities':   ['admin', 'manager', 'seller'],
  '/automations':  ['admin', 'manager'],
  '/reports':      ['admin', 'manager'],
  '/settings':     ['admin'],
  '/pricing':      ['admin', 'manager', 'seller'],
};

export const navPermissions = {
  mainNav: {
    '/':         ['admin', 'manager', 'seller'] as UserRole[],
    '/contacts': ['admin', 'manager', 'seller'] as UserRole[],
    '/pipeline': ['admin', 'manager', 'seller'] as UserRole[],
    '/tasks':    ['admin', 'manager', 'seller'] as UserRole[],
    '/emails':   ['admin', 'manager', 'seller'] as UserRole[],
    '/channels': ['admin', 'manager', 'seller'] as UserRole[],
  },
  moreNav: {
    '/automations': ['admin', 'manager'] as UserRole[],
    '/reports':     ['admin', 'manager'] as UserRole[],
    '/activities':  ['admin', 'manager', 'seller'] as UserRole[],
    '/settings':    ['admin'] as UserRole[],
  },
};

export const featurePermissions: Record<string, UserRole[]> = {
  'settings.team':         ['admin'],
  'settings.integrations': ['admin'],
  'settings.api':          ['admin'],
  'automations.create':    ['admin', 'manager'],
  'automations.toggle':    ['admin', 'manager'],
  'reports.team':          ['admin', 'manager'],
  'reports.individual':    ['admin', 'manager', 'seller'],
  'contacts.viewAll':      ['admin', 'manager'],
  'deals.viewAll':         ['admin', 'manager'],
  'tasks.viewAll':         ['admin', 'manager'],
  'team.manage':           ['admin'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = featurePermissions[permission];
  if (!perms) return false;
  return perms.includes(role);
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  for (const [pattern, roles] of Object.entries(routePermissions)) {
    if (pattern === path) return roles.includes(role);
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
    if (regex.test(path)) return roles.includes(role);
  }
  return false;
}

export function filterByOwnership<T extends { assignedTo: string }>(
  data: T[],
  user: User
): T[] {
  const role = effectiveRole(user);
  if (role === 'admin' || role === 'manager') return data;
  return data.filter(item => item.assignedTo === user.id);
}
