'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ACTIONS, can as allowed, ROLES, type Action } from '@/lib/construction/perms';
import { GROUPS, SECTIONS, useEn, useText, useWords, type Section } from '@/lib/construction/text';
import type { Data, Role } from '@/lib/construction/types';
import { inputCls, PageHead, Panel, Pill } from '../Kit';
import { hrefOf } from '../Shell';
import { useStore } from '../Store';

// The workspace's own manual, searchable: where to start for each role, what every section is for (read from the
// sidebar's groups, so a new section shows up here by itself — with a "no description yet" note until one is
// written), the permission matrix straight from perms.ts, a dictionary of the main records with live counts, how the
// data would connect to a real backend, and what changed between versions.

const W = {
  mn: {
    lead: 'Ажлын орон зайн гарын авлага: дүр бүрийн эхлэх алхам, хэсгүүдийн зориулалт, эрхийн матриц, өгөгдлийн толь, интеграцийн тэмдэглэл, хувилбарын өөрчлөлт.',
    search: 'Баримтаас хайх…',
    toc: 'Агуулга',
    noMatch: 'Хайлтад тохирох зүйл олдсонгүй.',
    matches: 'олдсон',
    yourRole: 'Таны одоогийн дүр',
    part: {
      start: 'Дүр бүрийн эхлэх заавар',
      sections: 'Хэсгүүдийн зориулалт',
      perms: 'Дүр × эрхийн матриц',
      data: 'Өгөгдлийн толь',
      integration: 'Интеграцийн тэмдэглэл',
      changes: 'Хувилбар, өөрчлөлт',
    },
    startLead: 'Дээд талын «Дүрээр харах» сонголтоор дүр бүрийн харагдах байдлыг шалгаж болно.',
    firstSteps: 'Эхний алхмууд',
    goTo: 'Гол хэсгүүд',
    roleGuide: {
      admin: ['Системийн удирдлагаас хэрэглэгч, дүр, байгууллагын лавлахыг шалгана.', 'Эрхийн матриц, аудитын бүртгэлийг тогтмол хянана.', 'Туршилтын дараа «Жишээ өгөгдлийг сэргээх»-ээр анхны байдалд оруулна.'],
      manager: ['Ерөнхий дашбоардаас хоцрогдол, хугацаа хэтэрсэн ажлыг харна.', 'Хуваарь, нэмэлт ажил, нэхэмжлэх, санхүүжилтийн хүсэлтийг батална.', 'Эрсдэлийн загвар, тайлангаар удирдлагад мэдээлнэ.'],
      engineer: ['Илгээгдсэн гүйцэтгэлийг нотлох баримттай нь хянаж батлах эсвэл буцаана.', 'Чанарын үзлэг, материал, ХАБЭА-ын бүртгэл хөтөлнө.', 'ТУХ хэсэгт хяналтын заавар, үзлэгээ бүртгэнэ.'],
      contractor: ['Гүйцэтгэлээ ноорог хэлбэрээр бүртгэж, зураг, актаар нотолж илгээнэ.', 'Нэмэлт ажил, материалын баталгаажуулалтын хүсэлт гаргана.', 'Үл тохирол, ХАБЭА-ын зөрчлийг хугацаанд нь арилгана.'],
      viewer: ['Дашбоард, тайлангаар төслийн явцыг харна.', 'Иргэдэд хүрэх үр өгөөж, төслийн мэдээллийг үзнэ.', 'Засах эрхгүй — өөрчлөлт хийх товч харагдахгүй.'],
    } as Record<Role, string[]>,
    secLead: 'Хажуугийн цэсний бүлэг, дарааллаар. Хэсгийн нэр дээр дарж нээнэ.',
    noDesc: 'Тайлбар хараахан бичигдээгүй.',
    desc: {
      dashboard: 'Төслийн нийт гүйцэтгэл, санхүү, хоцрогдол, эрсдэлийн товч зураг; бусад хэсэг рүү холбоостой.',
      schedule: 'Ажлын хуваарь, хамаарал, үндсэн хуваарьтай харьцуулсан хоцрогдол (Гантт).',
      progress: 'Биет гүйцэтгэлийг бүртгэх, нотлох баримт хавсаргах, хянах, батлах урсгал.',
      quality: 'Материал, ажлын үзлэг, шалгах хуудас, үл тохирол ба түүний арилгалт.',
      approveSchedule: 'Хуваарийн хувилбарыг хянаж, үндсэн хуваарь болгон батлах.',
      variations: 'Гэрээнд ороогүй нэмэлт ажлын хүсэлт, хяналт, баталгаажуулалт.',
      qualityDocs: 'Чанарын баталгаажуулалтын акт, гэрчилгээ, туршилтын баримтын бүртгэл.',
      materials: 'Материалын гэрчилгээ, дээж, нийлүүлэгчийн баталгаажуулалт.',
      project: 'Төслийн ерөнхий мэдээлэл: зорилго, байршил, оролцогч талууд, багцууд.',
      supervision: 'Техникийн хяналтын үзлэг, заавар, тэмдэглэл.',
      pkgDeps: 'Багц хоорондын хамаарал, нэгнийхээ хоцрогдлоос үүдэх нөлөө.',
      pkgProgress: 'Багц бүрийн төлөвлөсөн ба батлагдсан гүйцэтгэлийн харьцуулалт.',
      masterplan: 'Ерөнхий төлөвлөгөө: бүсчлэл, газар ашиглалт, барилгажилтын үзүүлэлт, зам, шугам.',
      detailplan: 'Хэсэгчилсэн ерөнхий төлөвлөгөө: хороолол, нэгж талбар, барилгын үзүүлэлт, үе шат.',
      land: 'Газар чөлөөлөлтийн явц, нэгж талбарын төлөв, маргаан.',
      permits: 'Зөвшөөрөл, техникийн нөхцөлийн бүртгэл, хугацааны хяналт.',
      safety: 'Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй: ажиглалт, осол, үзлэг, арга хэмжээ.',
      infra: 'Инженерийн шугам сүлжээ, замын гүйцэтгэл, байршил, техникийн үзүүлэлт.',
      iot: 'Талбайн мэдрэгчийн заалт (симуляц), босго давсан сэрэмжлүүлэг.',
      risk: 'Төслийн эрсдэлийн бүртгэл, магадлал × нөлөөний матриц, бууруулах арга хэмжээ, «хэрэв» шинжилгээ.',
      esg: 'Байгаль орчны эрсдэл, иргэдэд хүрэх үр өгөөжийн үзүүлэлтүүд.',
      suitability: 'Газар, байршлын тохиромжтой байдлын үнэлгээ.',
      finance: 'Багц бүрийн төсөв, гэрээ, нэхэмжлэх, батлагдсан ба бодит төлөлт.',
      funding: 'Санхүүжилтийн эх үүсвэр, хуваарилалт, татан авалтын хүсэлт, санхүүжилтийн дутагдал.',
      reports: 'Тогтмол тайлан, хэвлэх, экспортлох.',
      workflow: 'Батлах үйл явц бүрийн схем: хэн, ямар дарааллаар, аль хэсэгт, одоо хэдэн бүртгэл.',
      docs: 'ТЭЗҮ, БОНҮ, зураг, гэрээ зэрэг баримтын хувилбар, хандалт, батлалт.',
      sysdocs: 'Энэ хуудас — ажлын орон зайн гарын авлага.',
      admin: 'Хэрэглэгч, дүр, эрхийн матриц, лавлах өгөгдөл, аудитын бүртгэл.',
    } as Partial<Record<Section, string>>,
    permLead: 'perms.ts-ээс шууд уншина. Энэ демо-д шалгалт хөтөч дээр л хийгддэг — бодит хамгаалалт биш; сервер ижил матрицыг мөрдүүлэх ёстой.',
    action: 'Үйлдэл',
    actions: {
      'schedule.edit': 'Хуваарь засах',
      'baseline.approve': 'Үндсэн хуваарь батлах',
      'progress.submit': 'Гүйцэтгэл илгээх',
      'progress.review': 'Гүйцэтгэл хянах, батлах',
      'finance.view': 'Санхүүгийн мэдээлэл харах',
      'invoice.submit': 'Нэхэмжлэх илгээх',
      'invoice.review': 'Нэхэмжлэх батлах',
      'quality.edit': 'QA/QC бүртгэл',
      'safety.edit': 'ХАБЭА бүртгэл',
      'safety.restricted': 'Ослын нууц мэдээлэл харах',
      'land.edit': 'Газар чөлөөлөлт засах',
      'land.owners': 'Эзэмшигчийн мэдээлэл харах',
      'permit.edit': 'Зөвшөөрөл бүртгэх',
      'asset.edit': 'Дэд бүтэц засах',
      'doc.upload': 'Баримт оруулах',
      'doc.review': 'Баримт батлах',
      'doc.restricted': 'Хязгаарлагдсан баримт харах',
      'variation.submit': 'Нэмэлт ажлын хүсэлт гаргах',
      'variation.review': 'Нэмэлт ажил хянаж батлах',
      'material.submit': 'Материалын баталгаажуулалт илгээх',
      'material.review': 'Материал хянаж батлах',
      'supervision.edit': 'Хяналтын үзлэг, заавар бүртгэх',
      'plan.edit': 'Төлөвлөгөөний мэдээлэл засах',
      'funding.edit': 'Санхүүжилтийн мэдээлэл засах',
      admin: 'Системийн удирдлага',
    } as Record<Action, string>,
    dataLead: 'Ажлын орон зайн гол бүртгэлүүд (lib/construction/types.ts). Мөнгө сая ₮-өөр, огноо YYYY-MM-DD хэлбэрээр.',
    records: 'бүртгэл',
    field: 'Талбар',
    meaning: 'Утга',
    integration: [
      ['Store бол API-ийн хил', 'Бүх хуудас өгөгдлийг зөвхөн useStore()-оор уншиж, change()-ээр өөрчилнө. Бодит системд load / persist функцийг серверийн API дуудлагаар солиход хуудсуудыг өөрчлөх шаардлагагүй.'],
      ['Эрхийг сервер мөрдүүлнэ', 'can() шалгалт одоо зөвхөн интерфейсийг хэлбэржүүлдэг. Сервер хүсэлт бүрийг ижил эрхийн матрицаар шалгаж, жинхэнэ нэвтрэлт (байгууллагын SSO) холбох ёстой.'],
      ['Өгөгдөл хөтөч дээр хадгалагдана', 'Энэ демо-д бүх өөрчлөлт localStorage-д (tc:construction:v1) хадгалагдана. Хуудас бүрийн өөрийн бүртгэл (жишээ нь эрсдэл, санхүүжилт) tc:construction:x: угтвартай түлхүүрт хадгалагдаж, «Жишээ өгөгдлийг сэргээх»-ээр устна.'],
      ['Аудит', 'change() болон log() дуудлага бүр аудитын мөр үүсгэнэ (хэн, хэзээ, ямар үйлдэл, ямар бүртгэл). Сервер талд аудитыг өөрчлөх боломжгүй хадгална.'],
      ['Мөнгө ба хоосон утга', 'Төсөв, гэрээ, нэхэмжлэх, батлагдсан, төлөгдсөн дүнг хэзээ ч нэгтгэхгүй. Байхгүй утга «—» (null) — тэг биш.'],
      ['Газар зүйн өгөгдөл', 'Байршил дүүргийн зургийн метрээр (lib/construction/geo.ts). GIS-ээс импортлохдоо координатыг энэ системд хөрвүүлнэ; байршилгүй бүртгэл зөвшөөрөгдөнө.'],
      ['IoT мэдрэгч', 'Мэдрэгчийн заалт lib/monitor.ts-ийн симуляц. Бодит холболтод мэдрэгчийн API-ийг sensors бүртгэлийн sensor id-гаар холбоно.'],
    ] as [string, string][],
    changes: [
      ['2026-10-19', 'Ажлын орон зай өргөжсөн: батлах (хуваарь, нэмэлт ажил, чанарын баримт, материал), хяналт (төслийн мэдээлэл, ТУХ, багцын хамаарал, гүйцэтгэл, ерөнхий ба хэсэгчилсэн ЕТ, ХАБЭА), эрсдэлийн загвар, тохиромжтой байдлын үнэлгээ, санхүүжилт, үйл ажиллагааны схем, системийн баримт. Шинэ эрх: variation.*, material.*, supervision.edit, plan.edit, funding.edit.'],
      ['2026-10-16', 'Бүтээн байгуулалтын хяналтын ажлын орон зай: дашбоард, хуваарь, гүйцэтгэл, санхүү, чанар, газар чөлөөлөлт, зөвшөөрөл, дэд бүтэц, IoT, ESG, баримт, тайлан, удирдлага; эрхийн матриц, аудит, жишээ өгөгдөл.'],
      ['2026-10-13 – 15', 'TwinCore сайтын суурь: BIM үзүүлэгч, дижитал твин, системийн модулиуд.'],
    ] as [string, string][],
    current: 'Одоогийн хувилбар',
  },
  en: {
    lead: 'The workspace manual: where each role starts, what each section is for, the permission matrix, a data dictionary, integration notes and version history.',
    search: 'Search the documentation…',
    toc: 'Contents',
    noMatch: 'Nothing matches the search.',
    matches: 'found',
    yourRole: 'Your current role',
    part: {
      start: 'Getting started by role',
      sections: 'What each section does',
      perms: 'Role × permission matrix',
      data: 'Data dictionary',
      integration: 'Integration notes',
      changes: 'Versions and changes',
    },
    startLead: 'Use “View as” at the top to see the workspace as each role does.',
    firstSteps: 'First steps',
    goTo: 'Main sections',
    roleGuide: {
      admin: ['Check users, roles and the organisation list in Administration.', 'Review the permission matrix and the audit log regularly.', 'After testing, restore the start state with “Reset the sample data”.'],
      manager: ['Use the dashboard to spot delays and overdue work.', 'Approve schedules, extra work, invoices and drawdown requests.', 'Report to management with the risk model and reports.'],
      engineer: ['Review submitted progress with its evidence, then approve or send it back.', 'Keep quality inspections, materials and H&S records.', 'Record site instructions and inspections under Technical supervision.'],
      contractor: ['Record progress as a draft, attach photos or acts, and submit it.', 'Request extra work and submit materials for approval.', 'Close nonconformities and H&S findings on time.'],
      viewer: ['Follow the project on the dashboard and in reports.', 'See the benefits to residents and the project details.', 'Read-only — no edit buttons are shown.'],
    },
    secLead: 'In the sidebar’s groups and order. Click a section name to open it.',
    noDesc: 'No description written yet.',
    desc: {
      dashboard: 'The project at a glance: progress, money, delays and risks, with links into every section.',
      schedule: 'Activities, dependencies and slippage against the approved baseline (Gantt).',
      progress: 'Record physical progress, attach evidence, review and approve it.',
      quality: 'Material and work inspections, checklists, nonconformities and their close-out.',
      approveSchedule: 'Review a schedule revision and approve it as the baseline.',
      variations: 'Requests for work outside the contract, their review and approval.',
      qualityDocs: 'Quality acts, certificates and test records.',
      materials: 'Material certificates, samples and supplier approval.',
      project: 'Project overview: purpose, location, parties and packages.',
      supervision: 'Technical supervision: inspections, site instructions and notes.',
      pkgDeps: 'Dependencies between packages and how a delay in one affects another.',
      pkgProgress: 'Planned vs approved progress, package by package.',
      masterplan: 'The master plan: zoning, land use, building limits, roads and utility networks.',
      detailplan: 'The detailed plan: blocks, plots, building parameters and phasing.',
      land: 'Land clearance progress, parcel status and disputes.',
      permits: 'Permits and technical conditions, with expiry tracking.',
      safety: 'Health and safety: observations, incidents, inspections and actions.',
      infra: 'Utility networks and roads: progress, location and technical attributes.',
      iot: 'Site sensor readings (simulated) and threshold alerts.',
      risk: 'The project risk register, probability × impact matrix, mitigations and “what if”.',
      esg: 'Environmental risks and indicators of the benefits to residents.',
      suitability: 'Suitability assessment of land and locations.',
      finance: 'Each package’s budget, contracts, invoices, approved and actual payments.',
      funding: 'Funding sources, allocation, drawdown requests and the funding gap.',
      reports: 'Regular reports, printing and export.',
      workflow: 'Each approval process as a diagram: who, in which order, where, and how many records now.',
      docs: 'Feasibility, EIA, drawings, contracts and other documents with versions, access and approval.',
      sysdocs: 'This page — the workspace manual.',
      admin: 'Users, roles, the permission matrix, reference data and the audit log.',
    },
    permLead: 'Read straight from perms.ts. In this demo the checks run in the browser only — they are not security; the server must enforce the same matrix.',
    action: 'Action',
    actions: {
      'schedule.edit': 'Edit the schedule',
      'baseline.approve': 'Approve a baseline',
      'progress.submit': 'Submit progress',
      'progress.review': 'Review and approve progress',
      'finance.view': 'See financial data',
      'invoice.submit': 'Submit invoices',
      'invoice.review': 'Approve invoices',
      'quality.edit': 'QA/QC records',
      'safety.edit': 'H&S records',
      'safety.restricted': 'See confidential incident details',
      'land.edit': 'Edit land clearance',
      'land.owners': 'See owner information',
      'permit.edit': 'Register permits',
      'asset.edit': 'Edit infrastructure',
      'doc.upload': 'Upload documents',
      'doc.review': 'Approve documents',
      'doc.restricted': 'See restricted documents',
      'variation.submit': 'Request extra work',
      'variation.review': 'Review and approve extra work',
      'material.submit': 'Submit materials for approval',
      'material.review': 'Review and approve materials',
      'supervision.edit': 'Record inspections and site instructions',
      'plan.edit': 'Edit plan information',
      'funding.edit': 'Edit funding',
      admin: 'Administration',
    },
    dataLead: 'The workspace’s main records (lib/construction/types.ts). Money in million ₮, dates as YYYY-MM-DD.',
    records: 'records',
    field: 'Field',
    meaning: 'Meaning',
    integration: [
      ['The store is the API boundary', 'Every page reads through useStore() and changes data only through change(). In production, load / persist become calls to a server API, and no page has to change.'],
      ['The server enforces permissions', 'can() only shapes the interface today. The server must check every request against the same matrix, behind real sign-in (the organisation’s SSO).'],
      ['Data is kept in the browser', 'In this demo every change is saved in localStorage (tc:construction:v1). Records a page keeps for itself (risks, funding…) live under keys prefixed tc:construction:x: and are wiped by “Reset the sample data”.'],
      ['Audit', 'Every change() and log() call writes an audit line (who, when, which action, which record). On the server the audit trail must be append-only.'],
      ['Money and missing values', 'Budget, committed, invoiced, approved and paid are never added together. A missing value is “—” (null), not zero.'],
      ['Geography', 'Locations are in the district map’s metres (lib/construction/geo.ts). GIS imports convert into that system; records without a location are allowed.'],
      ['IoT sensors', 'Sensor readings are simulated by lib/monitor.ts. A real feed links its sensors by the sensor id in the sensors records.'],
    ] as [string, string][],
    changes: [
      ['2026-10-19', 'Workspace extended: approvals (schedules, extra work, quality records, materials), control (project details, technical supervision, package dependencies and progress, master and detailed plans, H&S), risk model, suitability assessment, funding, process map, system documentation. New permissions: variation.*, material.*, supervision.edit, plan.edit, funding.edit.'],
      ['2026-10-16', 'Construction control workspace: dashboard, schedule, progress, finance, quality, land clearance, permits, infrastructure, IoT, ESG, documents, reports, administration; permission matrix, audit log, sample data.'],
      ['2026-10-13 – 15', 'TwinCore site foundations: BIM viewer, digital twin, system modules.'],
    ] as [string, string][],
    current: 'Current version',
  },
};

// which sections each role starts from
const ROLE_SECTIONS: Record<Role, Section[]> = {
  admin: ['admin', 'sysdocs', 'dashboard'],
  manager: ['dashboard', 'approveSchedule', 'variations', 'finance', 'funding', 'risk', 'reports'],
  engineer: ['progress', 'quality', 'supervision', 'materials', 'qualityDocs', 'safety'],
  contractor: ['progress', 'schedule', 'quality', 'variations', 'materials', 'docs'],
  viewer: ['dashboard', 'reports', 'esg', 'project'],
};

type L = { mn: string; en: string };
const f = (name: string, mn: string, en: string): [string, L] => [name, { mn, en }];
// the data dictionary: record set, what it is, and its fields
const DICT: { key: keyof Data; what: L; fields: [string, L][] }[] = [
  { key: 'projects', what: { mn: 'Төсөл', en: 'Project' }, fields: [f('id', 'Төслийн дугаар', 'Project id'), f('name', 'Нэр', 'Name'), f('area', 'Байршил, дүүрэг', 'Location, district')] },
  {
    key: 'packages',
    what: { mn: 'Ажлын багц — гэрээ, төсөв, газрын зургийн хүрээ', en: 'Work package — contract, budget, map footprint' },
    fields: [f('project', 'Харьяалах төсөл', 'Parent project'), f('contractor', 'Гүйцэтгэгч байгууллага (байхгүй бол null)', 'Contractor org (null if none yet)'), f('status', 'planned / active / done / suspended', 'planned / active / done / suspended'), f('budget', 'Батлагдсан төсөв, сая ₮', 'Approved budget, ₮ mn'), f('geom', 'Газрын зураг дээрх тэгш өнцөгт', 'Rectangle on the map'), f('twin', 'Дижитал твин хуудасны холбоос', 'Link to the digital twin view')],
  },
  {
    key: 'activities',
    what: { mn: 'Хуваарийн ажил', en: 'Schedule activity' },
    fields: [f('pkg', 'Багц', 'Package'), f('start / finish', 'Одоогийн эхлэх, дуусах огноо', 'Current start and finish'), f('owner', 'Хариуцагч хэрэглэгч', 'Responsible user'), f('deps', 'Өмнөх ажлууд (тойрог үүсгэхгүй)', 'Predecessors (no loops)'), f('weight', 'Багц доторх жин, %', 'Weight within the package, %'), f('cost', 'Өртөг, сая ₮ — төлөвлөсөн санхүүжилтийн муруйд', 'Cost, ₮ mn — drives the planned cash curve')],
  },
  { key: 'baselines', what: { mn: 'Батлагдсан үндсэн хуваарь — дарж бичигдэхгүй', en: 'Approved baseline — never overwritten' }, fields: [f('label', 'Хувилбарын нэр', 'Version label'), f('approvedAt / approvedBy', 'Хэзээ, хэн баталсан', 'When and by whom'), f('dates', 'Ажил бүрийн батлагдсан огноо', 'Approved dates per activity')] },
  {
    key: 'progress',
    what: { mn: 'Биет гүйцэтгэлийн бүртгэл', en: 'Physical progress record' },
    fields: [f('activity', 'Ажил', 'Activity'), f('percent', 'Гүйцэтгэл, %', 'Percent complete'), f('evidence', 'Нотлох файл', 'Evidence files'), f('state', 'draft → submitted → approved / rejected', 'draft → submitted → approved / rejected'), f('history', 'Хэн, хэзээ, юу хийсэн', 'Who did what, when')],
  },
  { key: 'contracts', what: { mn: 'Гэрээ — үүрэг болсон дүн', en: 'Contract — committed amount' }, fields: [f('pkg / org', 'Багц, гүйцэтгэгч', 'Package, contractor'), f('amount', 'Гэрээний дүн, сая ₮', 'Contract value, ₮ mn'), f('signed', 'Гарын үсэг зурсан огноо', 'Date signed')] },
  { key: 'milestones', what: { mn: 'Гэрээний төлбөрийн үе шат', en: 'Contract payment milestone' }, fields: [f('contract', 'Гэрээ', 'Contract'), f('due', 'Хугацаа', 'Due date'), f('amount', 'Дүн, сая ₮', 'Amount, ₮ mn')] },
  {
    key: 'invoices',
    what: { mn: 'Нэхэмжлэх ба төлбөр', en: 'Invoice and payment' },
    fields: [f('contract / milestone', 'Гэрээ, үе шат (заавал биш)', 'Contract, milestone (optional)'), f('state', 'submitted → approved → paid, эсвэл rejected', 'submitted → approved → paid, or rejected'), f('paidOn', 'Бодит төлсөн огноо', 'Date actually paid')],
  },
  {
    key: 'inspections',
    what: { mn: 'Материал, ажлын үзлэг', en: 'Material or work inspection' },
    fields: [f('kind', 'material / work', 'material / work'), f('checklist', 'Шалгах зүйлс, тэнцсэн эсэх', 'Checklist items and results'), f('result', 'pass / fail', 'pass / fail'), f('at', 'Газрын зураг дээрх цэг', 'Point on the map')],
  },
  { key: 'defects', what: { mn: 'Үл тохирол (NCR)', en: 'Nonconformity (NCR)' }, fields: [f('inspection', 'Илрүүлсэн үзлэг', 'Inspection that found it'), f('severity', 'low / medium / high', 'low / medium / high'), f('owner / due', 'Арилгах хариуцагч, хугацаа', 'Who fixes it, by when'), f('state', 'open → review → resolved', 'open → review → resolved')] },
  { key: 'safety', what: { mn: 'ХАБЭА-ын бүртгэл', en: 'Health and safety record' }, fields: [f('kind', 'observation / incident / risk / inspection', 'observation / incident / risk / inspection'), f('detail', 'Хязгаарлагдсан мэдээлэл (нэр, гэмтэл) — safety.restricted эрхтэйд', 'Restricted detail (names, injuries) — safety.restricted only'), f('state', 'open → review → resolved', 'open → review → resolved')] },
  { key: 'parcels', what: { mn: 'Газар чөлөөлөх нэгж талбар', en: 'Land parcel to clear' }, fields: [f('status', 'not_started / negotiating / agreed / cleared / disputed', 'not_started / negotiating / agreed / cleared / disputed'), f('target / done', 'Төлөвлөсөн ба бодит дуусах огноо', 'Target and actual completion'), f('geom', 'Талбайн хүрээ (байхгүй байж болно)', 'Parcel outline (may be missing)')] },
  { key: 'permits', what: { mn: 'Зөвшөөрөл, техникийн нөхцөл', en: 'Permit or technical condition' }, fields: [f('type / ref', 'Төрөл, дугаар', 'Type, reference'), f('status', 'pending / approved / rejected / expired', 'pending / approved / rejected / expired'), f('expires', 'Дуусах огноо — 30 хоногийн өмнө сануулна', 'Expiry — warned 30 days ahead'), f('requirements', 'Дутуу шаардлагууд', 'Outstanding requirements')] },
  { key: 'assets', what: { mn: 'Инженерийн дэд бүтэц', en: 'Infrastructure asset' }, fields: [f('kind', 'water / heat / power / sewer / telecom / road', 'water / heat / power / sewer / telecom / road'), f('planned / actual', 'Төлөвлөсөн ба бодит гүйцэтгэл, %', 'Planned and actual progress, %'), f('geom', 'Шугамын трасс (байхгүй байж болно)', 'Route line (may be missing)'), f('attrs', 'Техникийн үзүүлэлт', 'Technical attributes')] },
  { key: 'sensors', what: { mn: 'IoT мэдрэгчийн холбоос', en: 'IoT sensor link' }, fields: [f('sensor', 'Мэдрэгчийн дугаар', 'Sensor id'), f('pkg / asset', 'Багц, хянаж буй объект', 'Package, monitored object'), f('at', 'Байршил', 'Location')] },
  { key: 'indicators', what: { mn: 'Байгаль орчин, нийгмийн үзүүлэлт', en: 'Environmental or social indicator' }, fields: [f('method', 'measured / calculated / estimated', 'measured / calculated / estimated'), f('baseline / current', 'Суурь ба одоогийн утга (null бол мэдээлэлгүй)', 'Baseline and current (null = no data)'), f('better', 'lower / higher — аль чиглэл сайн', 'lower / higher — which way is better'), f('source / period', 'Эх сурвалж, хугацаа', 'Source, period')] },
  { key: 'risks', what: { mn: 'Байгаль орчны эрсдэл (ESG)', en: 'Environmental risk (ESG)' }, fields: [f('level', 'low / medium / high', 'low / medium / high'), f('mitigation', 'Бууруулах арга хэмжээ', 'Mitigation'), f('state', 'open → review → resolved', 'open → review → resolved')] },
  { key: 'docs', what: { mn: 'Баримт бичиг', en: 'Document' }, fields: [f('type', 'feasibility / eia / permit / contract / drawing / inspection / report / other', 'feasibility / eia / permit / contract / drawing / inspection / report / other'), f('version', 'Хувилбар — шинэ нь хуучнаа хүчингүй болгоно', 'Version — a newer one supersedes'), f('links', 'Холбогдох багц, ажил, талбар, объект, зөвшөөрөл', 'Linked package, activity, parcel, asset, permit'), f('access', 'public / project / restricted', 'public / project / restricted')] },
  { key: 'orgs', what: { mn: 'Байгууллага', en: 'Organisation' }, fields: [f('kind', 'client / contractor / consultant / authority / utility', 'client / contractor / consultant / authority / utility')] },
  { key: 'users', what: { mn: 'Хэрэглэгч', en: 'User' }, fields: [f('org', 'Байгууллага', 'Organisation'), f('role', 'admin / manager / engineer / contractor / viewer', 'admin / manager / engineer / contractor / viewer'), f('projects', 'Хандах төслүүд', 'Projects the user may access')] },
  { key: 'audit', what: { mn: 'Аудитын мөр (сүүлийн 500)', en: 'Audit line (latest 500)' }, fields: [f('at / by', 'Хэзээ, хэн', 'When, who'), f('action', 'Эрхийн үйлдэл', 'Permission action'), f('entity / detail', 'Бүртгэл, юу өөрчлөгдсөн', 'Record, what changed')] },
];

type Part = 'start' | 'sections' | 'perms' | 'data' | 'integration' | 'changes';
const PARTS: Part[] = ['start', 'sections', 'perms', 'data', 'integration', 'changes'];

export default function SystemDocs() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, role } = useStore();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const hit = (...parts: (string | undefined)[]) => !query || parts.join(' ').toLowerCase().includes(query);
  const L = (x: L) => (en ? x.en : x.mn);

  // what survives the search, part by part
  const roles = ROLES.filter((r) => hit(t.role[r], ...w.roleGuide[r], ...ROLE_SECTIONS[r].map((s) => t.section[s])));
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((s) => hit(t.group[g.key], t.section[s], w.desc[s], s)) })).filter((g) => g.items.length);
  const actions = ACTIONS.filter((a) => hit(a, w.actions[a]));
  const dict = DICT.filter((d) => hit(d.key, L(d.what), ...d.fields.flatMap(([n, m]) => [n, L(m)])));
  const notes = w.integration.filter(([h, b]) => hit(h, b));
  const changes = w.changes.filter(([d, b]) => hit(d, b));
  const counts: Record<Part, number> = { start: roles.length, sections: groups.reduce((s, g) => s + g.items.length, 0), perms: actions.length, data: dict.length, integration: notes.length, changes: changes.length };
  const shown = PARTS.filter((p) => counts[p] > 0);

  const toc = (
    <ol className="space-y-0.5 text-sm">
      {PARTS.map((p, k) => (
        <li key={p}>
          <a href={`#sd-${p}`} className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 hover:bg-surface/60 ${counts[p] ? 'text-fg/85' : 'pointer-events-none text-mute/50'}`}>
            <span>
              <span className="mr-2 font-mono text-[11px] text-mute">{k + 1}</span>
              {w.part[p]}
            </span>
            {query && <span className="font-mono text-[11px] text-mute">{counts[p]}</span>}
          </a>
        </li>
      ))}
    </ol>
  );

  const part = (p: Part, body: ReactNode, action?: ReactNode) =>
    counts[p] > 0 && (
      <div id={`sd-${p}`} className="scroll-mt-24">
        <Panel title={`${PARTS.indexOf(p) + 1}. ${w.part[p]}`} action={action}>
          {body}
        </Panel>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHead title={t.section.sysdocs} lead={w.lead} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* contents: a sticky side list on desktop, a fold-out on phones */}
        <aside className="min-w-0">
          <div className="space-y-3 lg:sticky lg:top-24">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.search} aria-label={w.search} className={`${inputCls} h-10 w-full`} />
            <details className="rounded-xl border border-line lg:hidden">
              <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm">{w.toc}</summary>
              <div className="border-t border-line p-1">{toc}</div>
            </details>
            <nav aria-label={w.toc} className="hidden rounded-xl border border-line p-1 lg:block">
              <p className="px-3 py-2 text-xs text-mute">{w.toc}</p>
              {toc}
            </nav>
            <p className="px-1 text-xs text-mute">
              {w.yourRole}: <Pill tone="info">{t.role[role]}</Pill>
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {!shown.length && <p className="rounded-xl border border-line px-4 py-6 text-center text-sm text-mute">{w.noMatch}</p>}

          {part(
            'start',
            <>
              <p className="mb-4 text-xs text-mute">{w.startLead}</p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {roles.map((r) => (
                  <div key={r} className={`rounded-xl border p-4 ${r === role ? 'border-accent/50 bg-accent/[0.05]' : 'border-line'}`}>
                    <p className="flex items-center gap-2 font-medium">
                      {t.role[r]} {r === role && <Pill tone="info">✓</Pill>}
                    </p>
                    <p className="mt-3 text-xs text-mute">{w.firstSteps}</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm text-fg/85">
                      {w.roleGuide[r].map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <p className="mt-3 text-xs text-mute">{w.goTo}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ROLE_SECTIONS[r].map((s) => (
                        <Link key={s} href={hrefOf(s)} className="inline-flex min-h-8 items-center rounded-full border border-line px-3 text-xs text-fg/85 hover:border-accent/60">
                          {t.section[s]}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>,
          )}

          {part(
            'sections',
            <>
              <p className="mb-4 text-xs text-mute">{w.secLead}</p>
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.key}>
                    <p className="mb-2 text-xs tracking-wide text-mute uppercase">{t.group[g.key]}</p>
                    <ul className="divide-y divide-line/60 rounded-xl border border-line">
                      {g.items.map((s) => (
                        <li key={s} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                          <Link href={hrefOf(s)} className="shrink-0 text-sm text-accent-hi hover:underline sm:w-56">
                            <span className="mr-1.5 font-mono text-[10px] text-mute">{SECTIONS.indexOf(s) + 1}</span>
                            {t.section[s]}
                          </Link>
                          <span className={`text-sm ${w.desc[s] ? 'text-fg/80' : 'text-mute italic'}`}>{w.desc[s] ?? w.noDesc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>,
          )}

          {part(
            'perms',
            <>
              <p className="mb-3 text-xs text-mute">{w.permLead}</p>
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-mute">
                      <th scope="col" className="px-2 py-2 font-normal">
                        {w.action}
                      </th>
                      {ROLES.map((r) => (
                        <th key={r} scope="col" className={`px-2 py-2 text-center font-normal ${r === role ? 'text-accent-hi' : ''}`}>
                          {t.role[r]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {actions.map((a) => (
                      <tr key={a}>
                        <th scope="row" className="px-2 py-1.5 text-left font-normal">
                          {w.actions[a]} <span className="font-mono text-[10px] text-mute">{a}</span>
                        </th>
                        {ROLES.map((r) => (
                          <td key={r} className={`px-2 py-1.5 text-center ${r === role ? 'bg-accent/[0.06]' : ''}`}>
                            {allowed(r, a) ? (
                              <span className="text-emerald-300" aria-label="✓">
                                ✓
                              </span>
                            ) : (
                              <span className="text-mute" aria-label="—">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>,
          )}

          {part(
            'data',
            <>
              <p className="mb-4 text-xs text-mute">{w.dataLead}</p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-2">
                {dict.map((d) => (
                  <div key={d.key} className="rounded-xl border border-line p-3">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <p>
                        <span className="font-mono text-sm text-accent-hi">{d.key}</span> <span className="text-sm text-fg/85">— {L(d.what)}</span>
                      </p>
                      <span className="font-mono text-[11px] text-mute">
                        {(data[d.key] as unknown[]).length} {w.records}
                      </span>
                    </div>
                    <dl className="space-y-1 text-xs">
                      {d.fields.map(([n, m]) => (
                        <div key={n} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2">
                          <dt className="font-mono break-words text-fg/80">{n}</dt>
                          <dd className="text-mute">{L(m)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </>,
          )}

          {part(
            'integration',
            <ul className="space-y-3">
              {notes.map(([h, b]) => (
                <li key={h} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium">{h}</p>
                  <p className="mt-1 text-sm text-fg/75">{b}</p>
                </li>
              ))}
            </ul>,
          )}

          {part(
            'changes',
            <ol className="relative space-y-4 border-l border-line pl-4">
              {changes.map(([d, b], k) => (
                <li key={d} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-accent" />
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-mute">{d}</span>
                    {k === 0 && !query && <Pill tone="good">{w.current}</Pill>}
                  </p>
                  <p className="mt-1 text-fg/80">{b}</p>
                </li>
              ))}
            </ol>,
          )}
        </div>
      </div>
    </div>
  );
}
