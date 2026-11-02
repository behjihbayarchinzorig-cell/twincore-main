// The construction workspace's records. Every activity is tied to a project and package, a place on the map where it
// has one, a responsible party, a status, and a history of what happened to it.
//
// Dates are ISO strings (YYYY-MM-DD). Money is in million tugrik (₮ mn). Map geometry is in the district map's units
// (metres east / south of its north-west corner, see lib/construction/geo.ts).

export type Id = string;
export type Rect = { x: number; y: number; w: number; h: number };
export type Line = [number, number][];

// who did what, when (kept on every record that has a workflow)
export type Event = { at: string; by: Id; action: string; comment?: string };

export type OrgKind = 'client' | 'contractor' | 'consultant' | 'authority' | 'utility';
export type Org = { id: Id; name: string; kind: OrgKind };

export type Role = 'admin' | 'manager' | 'engineer' | 'contractor' | 'viewer';
export type User = { id: Id; name: string; org: Id; role: Role; projects: Id[] };

export type Project = { id: Id; name: string; area: string };

export type PkgStatus = 'planned' | 'active' | 'done' | 'suspended';
export type Package = { id: Id; project: Id; name: string; contractor: Id | null; status: PkgStatus; budget: number; geom: Rect; twin?: string };

// ---- schedule ----------------------------------------------------------------------------------------------------
export type Activity = { id: Id; pkg: Id; name: string; start: string; finish: string; owner: Id; deps: Id[]; weight: number; cost: number };
// an approved baseline is never overwritten: a revision is a new baseline
export type Baseline = { id: Id; label: string; approvedAt: string; approvedBy: Id; dates: Record<Id, { start: string; finish: string }> };

// ---- physical progress ---------------------------------------------------------------------------------------------
export type ProgressState = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ProgressRecord = { id: Id; activity: Id; date: string; percent: number; note: string; evidence: string[]; state: ProgressState; by: Id; history: Event[] };

// ---- money: kept apart on purpose ------------------------------------------------------------------------------------
// budget (approved, per package) → contract (committed) → invoice (submitted) → approved payment → paid (actual)
export type Contract = { id: Id; pkg: Id; org: Id; title: string; amount: number; signed: string };
export type Milestone = { id: Id; contract: Id; name: string; due: string; amount: number };
export type InvoiceState = 'submitted' | 'approved' | 'rejected' | 'paid';
export type Invoice = { id: Id; contract: Id; milestone: Id | null; amount: number; date: string; state: InvoiceState; paidOn?: string; history: Event[] };

// ---- quality and safety ------------------------------------------------------------------------------------------------
export type IssueState = 'open' | 'review' | 'resolved';
export type Severity = 'low' | 'medium' | 'high';
export type Inspection = { id: Id; kind: 'material' | 'work'; pkg: Id; title: string; date: string; by: Id; checklist: { item: string; ok: boolean }[]; result: 'pass' | 'fail'; at?: [number, number] };
export type Defect = { id: Id; pkg: Id; inspection: Id | null; title: string; severity: Severity; owner: Id; due: string; action: string; state: IssueState; at?: [number, number]; history: Event[] };
export type SafetyKind = 'observation' | 'incident' | 'risk' | 'inspection';
// `detail` of an incident is restricted (names, injuries): shown only to roles that may see it
export type SafetyRecord = { id: Id; kind: SafetyKind; pkg: Id; title: string; severity: Severity; owner: Id; date: string; due: string; action: string; state: IssueState; detail?: string; at?: [number, number]; history: Event[] };

// ---- land, permits, infrastructure -----------------------------------------------------------------------------------
export type ParcelStatus = 'not_started' | 'negotiating' | 'agreed' | 'cleared' | 'disputed';
export type Parcel = { id: Id; project: Id; geom: Rect | null; status: ParcelStatus; responsible: Id; started: string; target: string; done?: string; docs: Id[]; issues: string };
export type PermitStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type Permit = { id: Id; type: string; ref: string; pkg: Id; org: Id; submitted: string; decided?: string; expires?: string; status: PermitStatus; owner: Id; docs: Id[]; comments: Event[]; requirements: string[] };
export type AssetKind = 'water' | 'heat' | 'power' | 'sewer' | 'telecom' | 'road';
export type AssetStatus = 'planned' | 'ongoing' | 'completed' | 'delayed';
// geometry may be missing: detailed utility geometry isn't always available
export type Asset = { id: Id; kind: AssetKind; name: string; pkg: Id; org: Id; geom: Line | null; planned: number; actual: number | null; status: AssetStatus; attrs: Record<string, string>; docs: Id[] };

// ---- sensors (simulated: see lib/monitor.ts) ----------------------------------------------------------------------------
export type SensorLink = { sensor: Id; pkg: Id; asset: string; at: [number, number] };

// ---- environment and society ---------------------------------------------------------------------------------------------
export type Method = 'measured' | 'calculated' | 'estimated';
export type Indicator = { id: Id; group: 'env' | 'social'; name: string; unit: string; period: string; source: string; method: Method; baseline: number | null; current: number | null; better: 'lower' | 'higher'; definition: string };
export type EnvRisk = { id: Id; title: string; level: Severity; mitigation: string; owner: Id; state: IssueState; pkg: Id };

// ---- documents --------------------------------------------------------------------------------------------------------
export type DocType = 'feasibility' | 'eia' | 'permit' | 'contract' | 'drawing' | 'inspection' | 'report' | 'other';
export type DocState = 'draft' | 'review' | 'approved' | 'superseded';
export type Access = 'public' | 'project' | 'restricted';
export type Doc = { id: Id; title: string; type: DocType; ref: string; version: number; links: { pkg?: Id; activity?: Id; parcel?: Id; asset?: Id; permit?: Id }; owner: Id; uploaded: string; state: DocState; access: Access; size?: number; history: Event[] };

// ---- the audit trail ----------------------------------------------------------------------------------------------------
export type Audit = { at: string; by: Id; action: string; entity: string; detail: string };

export type Data = {
  orgs: Org[];
  users: User[];
  projects: Project[];
  packages: Package[];
  activities: Activity[];
  baselines: Baseline[];
  progress: ProgressRecord[];
  contracts: Contract[];
  milestones: Milestone[];
  invoices: Invoice[];
  inspections: Inspection[];
  defects: Defect[];
  safety: SafetyRecord[];
  parcels: Parcel[];
  permits: Permit[];
  assets: Asset[];
  sensors: SensorLink[];
  indicators: Indicator[];
  risks: EnvRisk[];
  docs: Doc[];
  audit: Audit[];
};
