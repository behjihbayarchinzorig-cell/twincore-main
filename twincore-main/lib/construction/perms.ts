// Who may do what. In this demonstration the checks run in the browser only — they shape the interface, they do not
// secure anything. A production deployment must enforce the same matrix on the server (API boundary), with real
// sign-in; see the workspace's "Системийн удирдлага" page.

import type { Section } from './text';
import type { Role } from './types';

export type Action =
  | 'schedule.edit'
  | 'baseline.approve'
  | 'progress.submit'
  | 'progress.review'
  | 'finance.view'
  | 'invoice.submit'
  | 'invoice.review'
  | 'quality.edit'
  | 'safety.edit'
  | 'safety.restricted'
  | 'land.edit'
  | 'land.owners'
  | 'permit.edit'
  | 'asset.edit'
  | 'doc.upload'
  | 'doc.review'
  | 'doc.restricted'
  | 'variation.submit'
  | 'variation.review'
  | 'material.submit'
  | 'material.review'
  | 'supervision.edit'
  | 'plan.edit'
  | 'funding.edit'
  | 'admin';

export const ACTIONS: Action[] = [
  'schedule.edit',
  'baseline.approve',
  'progress.submit',
  'progress.review',
  'finance.view',
  'invoice.submit',
  'invoice.review',
  'quality.edit',
  'safety.edit',
  'safety.restricted',
  'land.edit',
  'land.owners',
  'permit.edit',
  'asset.edit',
  'doc.upload',
  'doc.review',
  'doc.restricted',
  'variation.submit',
  'variation.review',
  'material.submit',
  'material.review',
  'supervision.edit',
  'plan.edit',
  'funding.edit',
  'admin',
];

export const ROLES: Role[] = ['admin', 'manager', 'engineer', 'contractor', 'viewer'];

const MATRIX: Record<Role, Action[]> = {
  admin: ACTIONS,
  manager: ACTIONS.filter((a) => a !== 'admin'),
  engineer: ['schedule.edit', 'progress.submit', 'progress.review', 'finance.view', 'quality.edit', 'safety.edit', 'safety.restricted', 'asset.edit', 'doc.upload', 'doc.review', 'variation.review', 'material.review', 'supervision.edit', 'plan.edit'],
  contractor: ['progress.submit', 'invoice.submit', 'quality.edit', 'safety.edit', 'doc.upload', 'variation.submit', 'material.submit'],
  viewer: [],
};

export const can = (role: Role, a: Action) => MATRIX[role].includes(a);

// Which sections each role is given: a person sees the work they are appointed to, nothing more. Only the
// administrator sees every section — and only the administrator gets the reports, which cut across all of it.
// (Like `can`, this shapes the interface only; the server must apply the same rule.)
const SECTION_ACCESS: Record<Exclude<Role, 'admin'>, Section[]> = {
  // runs the project: everything except the reports and system administration
  manager: [
    'progress', 'schedule', 'quality', 'approveSchedule', 'variations', 'qualityDocs', 'materials',
    'dashboard', 'project', 'supervision', 'pkgDeps', 'pkgProgress', 'masterplan', 'detailplan', 'land', 'permits', 'safety', 'infra',
    'iot', 'risk', 'esg', 'suitability', 'finance', 'funding', 'workflow', 'docs', 'sysdocs',
  ],
  // supervises the works on site: checks progress and quality, reviews extra work and materials, issues instructions
  engineer: [
    'progress', 'schedule', 'quality', 'variations', 'qualityDocs', 'materials',
    'dashboard', 'project', 'supervision', 'pkgDeps', 'pkgProgress', 'safety', 'infra',
    'iot', 'risk', 'workflow', 'docs', 'sysdocs',
  ],
  // builds a package: reports progress, submits extra work, materials and invoices, answers instructions
  contractor: [
    'progress', 'schedule', 'quality', 'variations', 'qualityDocs', 'materials',
    'dashboard', 'project', 'supervision', 'pkgProgress', 'safety', 'finance', 'workflow', 'docs', 'sysdocs',
  ],
  // follows the project from outside: the overview, the plans and the public outcomes, read only
  viewer: ['dashboard', 'project', 'pkgProgress', 'masterplan', 'detailplan', 'iot', 'esg', 'suitability', 'workflow', 'sysdocs'],
};
export const canSee = (role: Role, s: Section) => role === 'admin' || SECTION_ACCESS[role].includes(s);
