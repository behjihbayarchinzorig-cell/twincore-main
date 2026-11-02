'use client';

import type { Section } from '@/lib/construction/text';
import Admin from './sections/Admin';
import ApproveSchedule from './sections/ApproveSchedule';
import Variations from './sections/Variations';
import QualityDocs from './sections/QualityDocs';
import Materials from './sections/Materials';
import ProjectInfo from './sections/ProjectInfo';
import Supervision from './sections/Supervision';
import PackageDeps from './sections/PackageDeps';
import PackageProgress from './sections/PackageProgress';
import MasterPlan from './sections/MasterPlan';
import DetailPlan from './sections/DetailPlan';
import Safety from './sections/Safety';
import RiskModel from './sections/RiskModel';
import Suitability from './sections/Suitability';
import Funding from './sections/Funding';
import Workflow from './sections/Workflow';
import SystemDocs from './sections/SystemDocs';
import Docs from './sections/Docs';
import Esg from './sections/Esg';
import Finance from './sections/Finance';
import Infra from './sections/Infra';
import Iot from './sections/Iot';
import Land from './sections/Land';
import Permits from './sections/Permits';
import Progress from './sections/Progress';
import Quality from './sections/Quality';
import Reports from './sections/Reports';
import Schedule from './sections/Schedule';

// one workspace section per route
const VIEWS: Record<Exclude<Section, 'dashboard'>, () => React.ReactNode> = {
  schedule: Schedule,
  progress: Progress,
  finance: Finance,
  quality: Quality,
  land: Land,
  permits: Permits,
  infra: Infra,
  iot: Iot,
  esg: Esg,
  docs: Docs,
  reports: Reports,
  admin: Admin,
  approveSchedule: ApproveSchedule,
  variations: Variations,
  qualityDocs: QualityDocs,
  materials: Materials,
  project: ProjectInfo,
  supervision: Supervision,
  pkgDeps: PackageDeps,
  pkgProgress: PackageProgress,
  masterplan: MasterPlan,
  detailplan: DetailPlan,
  safety: Safety,
  risk: RiskModel,
  suitability: Suitability,
  funding: Funding,
  workflow: Workflow,
  sysdocs: SystemDocs,
};

export default function SectionView({ section }: { section: Exclude<Section, 'dashboard'> }) {
  const View = VIEWS[section];
  return <View />;
}
