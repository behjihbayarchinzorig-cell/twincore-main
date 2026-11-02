// Sample interface register for the package dependencies page: links between activities of different packages that
// the schedule itself doesn't carry (the demo schedule links activities only within a package). Each says which
// activity must finish before which, and why. Ids refer to lib/construction/demo.ts.

import type { Id } from '../types';

export type InterfaceLink = { id: Id; act: Id; dep: Id; note: string; by: Id; at: string };

export const INTERFACES: InterfaceLink[] = [
  { id: 'IF-1', act: 'A-02-2', dep: 'A-03-2', note: 'Гудамжны ус зайлуулах суваг цэвэр, бохир усны шугамын дээгүүр гарна — шугам угсарч дууссаны дараа.', by: 'u-pm', at: '2026-01-05' },
  { id: 'IF-2', act: 'A-05-2', dep: 'A-02-2', note: 'Дулааны шугам гудамжийг хөндлөн огтолно — ус зайлуулах суваг тавигдсаны дараа шуудуу ухна.', by: 'u-pm', at: '2026-01-05' },
  { id: 'IF-3', act: 'A-02-4', dep: 'A-05-2', note: 'Асфальт хучихаас өмнө гудамж дагуух дулааны шугам бүрэн дуусах ёстой (дахин ухахгүйн тулд).', by: 'u-pm', at: '2026-01-05' },
  { id: 'IF-4', act: 'A-01-6', dep: 'A-05-1', note: 'Блок А-ийн инженерийн систем дэд станцаас дулаан авна.', by: 'u-eng', at: '2026-02-10' },
  { id: 'IF-5', act: 'A-04-2', dep: 'A-02-3', note: 'Сургуулийн суурийн ажилд хүнд машин орох замын суурь давхарга бэлэн байх.', by: 'u-pm', at: '2026-03-02' },
  { id: 'IF-6', act: 'A-04-1', dep: 'A-03-3', note: 'Зураг төсөлд ус, бохир усны техникийн нөхцөл шаардлагатай — шугам хүлээлгэсний дараа олгоно.', by: 'u-pm', at: '2026-03-02' },
];
