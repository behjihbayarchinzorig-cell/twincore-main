'use client';

import { useMemo, useState } from 'react';
import { nextId, stamp, useStore } from '../Store';
import { checkFile, FILE_MAX, FILE_TYPES, type Problem } from '@/lib/construction/validate';
import { useText, useWords } from '@/lib/construction/text';
import type { Access, Doc, DocState, DocType } from '@/lib/construction/types';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';

// The document register: feasibility studies, environmental assessments, permits, contracts, drawings, inspection
// records. Each has a type, a version, what it is linked to, who owns it, where it is in review, and who may see it.
// There is no file server yet: an "upload" checks the file (type, size) and records its details only — the file
// itself goes nowhere, and no public link is ever made.

const W = {
  mn: {
    lead: 'ТЭЗҮ, БОНҮ, зөвшөөрөл, гэрээ, зураг, шалгалтын баримтын нэгдсэн бүртгэл — хувилбар, төлөв, хандах эрхтэй.',
    register: 'Бүртгэл',
    title: 'Нэр',
    type: 'Төрөл',
    ref: 'Дугаар',
    version: 'Хувилбар',
    links: 'Холбоос',
    uploaded: 'Оруулсан',
    access: 'Хандах эрх',
    accessL: { public: 'Нийтэд', project: 'Төслийн баг', restricted: 'Хязгаарлагдсан' } as Record<Access, string>,
    flow: 'Хянах, батлах явц',
    upload: 'Баримт бүртгэх',
    newVersion: 'Шинэ хувилбар',
    file: 'Файл',
    noServer: 'Файлын сервер холбогдоогүй: зөвхөн файлын мэдээлэл (нэр, хэмжээ, төрөл) энэ хөтөч дээр бүртгэгдэнэ. Файл өөрөө хаашаа ч илгээгдэхгүй, нийтийн холбоос үүсэхгүй.',
    allowed: 'Зөвшөөрөгдөх: JPG, PNG, WEBP, PDF · 10 МБ хүртэл',
    submit: 'Хянуулахаар илгээх',
    approve: 'Батлах',
    back: 'Буцаах (ноорог)',
    kpiTotal: 'Баримт',
    kpiReview: 'Хянагдаж буй',
    kpiRestricted: 'Хязгаарлагдсан',
    linkedPkg: 'Багц',
    none: '—',
    fileInfo: 'Файлын мэдээлэл',
  },
  en: {
    lead: 'One register of feasibility studies, EIAs, permits, contracts, drawings and inspection records — with versions, status and access.',
    register: 'Register',
    title: 'Title',
    type: 'Type',
    ref: 'Reference',
    version: 'Version',
    links: 'Linked to',
    uploaded: 'Uploaded',
    access: 'Access',
    accessL: { public: 'Public', project: 'Project team', restricted: 'Restricted' },
    flow: 'Review and approval',
    upload: 'Register a document',
    newVersion: 'New version',
    file: 'File',
    noServer: 'No file server is connected: only the file’s details (name, size, type) are recorded, in this browser. The file itself is sent nowhere and no public link is made.',
    allowed: 'Allowed: JPG, PNG, WEBP, PDF · up to 10 MB',
    submit: 'Submit for review',
    approve: 'Approve',
    back: 'Send back (draft)',
    kpiTotal: 'Documents',
    kpiReview: 'Under review',
    kpiRestricted: 'Restricted',
    linkedPkg: 'Package',
    none: '—',
    fileInfo: 'File details',
  },
};

const TYPES: DocType[] = ['feasibility', 'eia', 'permit', 'contract', 'drawing', 'inspection', 'report', 'other'];
const STATES: DocState[] = ['draft', 'review', 'approved', 'superseded'];
const ACCESS: Access[] = ['public', 'project', 'restricted'];
const FLOW: DocState[] = ['draft', 'review', 'approved', 'superseded'];

export default function Docs() {
  const t = useText();
  const w = useWords(W);
  const { data, can, change, user } = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | DocType>('all');
  const [state, setState] = useState<'all' | DocState>('all');
  const [access, setAccess] = useState<'all' | Access>('all');
  const [pkg, setPkg] = useState('all');
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<{ base: string | null } | null>(null);

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const seeRestricted = can('doc.restricted');
  const hidden = (d: Doc) => d.access === 'restricted' && !seeRestricted;

  const list = useMemo(
    () =>
      data.docs.filter(
        (d) =>
          (type === 'all' || d.type === type) &&
          (state === 'all' || d.state === state) &&
          (access === 'all' || d.access === access) &&
          (pkg === 'all' || d.links.pkg === pkg) &&
          (!q.trim() || `${d.title} ${d.ref}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [data.docs, type, state, access, pkg, q],
  );
  const doc = data.docs.find((d) => d.id === sel) ?? null;

  const links = (d: Doc) => Object.entries(d.links).filter(([, v]) => v) as [string, string][];
  const move = (d: Doc, to: DocState, action: string) =>
    change('doc.review', d.id, `${d.state} → ${to}`, (x) => {
      const r = x.docs.find((y) => y.id === d.id);
      if (!r) return;
      r.state = to;
      r.history.push({ at: stamp(), by: user, action });
    });

  return (
    <div className="space-y-6">
      <PageHead title={t.section.docs} lead={w.lead} action={can('doc.upload') ? <Btn kind="primary" onClick={() => setForm({ base: null })}>{w.upload}</Btn> : <Forbidden />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.kpiTotal} value={data.docs.length} />
        <Kpi label={w.kpiReview} value={data.docs.filter((d) => d.state === 'review').length} tone={data.docs.some((d) => d.state === 'review') ? 'warn' : 'neutral'} />
        <Kpi label={t.docState.approved} value={data.docs.filter((d) => d.state === 'approved').length} tone="good" />
        <Kpi label={w.kpiRestricted} value={data.docs.filter((d) => d.access === 'restricted').length} />
      </div>

      <Panel title={w.register}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={t.filter.search}>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} placeholder={t.filter.search} />
          </Field>
          <Select label={w.type} value={type} onChange={setType} options={[['all', t.filter.all], ...TYPES.map((x): [DocType, string] => [x, t.docType[x]])]} />
          <Select label={t.common.status} value={state} onChange={setState} options={[['all', t.filter.all], ...STATES.map((x): [DocState, string] => [x, t.docState[x]])]} />
          <Select label={w.access} value={access} onChange={setAccess} options={[['all', t.filter.all], ...ACCESS.map((x): [Access, string] => [x, w.accessL[x]])]} />
          <Select label={w.linkedPkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
        </div>
        <Table head={[w.title, w.type, w.ref, w.version, w.links, t.common.owner, w.uploaded, t.common.status, w.access]} empty={!list.length}>
          {list.map((d) => (
            <tr key={d.id} className={`cursor-pointer ${d.id === sel ? 'bg-accent/[0.07]' : 'hover:bg-surface/60'}`} onClick={() => setSel(d.id)}>
              <td className="px-2 py-2">
                <button type="button" onClick={() => setSel(d.id)} className="cursor-pointer text-left hover:text-accent-hi">
                  {d.title}
                </button>
                {hidden(d) && <p className="text-xs text-mute">🔒 {t.common.restricted}</p>}
              </td>
              <td className="px-2 py-2 text-xs">{t.docType[d.type]}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{hidden(d) ? '•••' : d.ref}</td>
              <td className="px-2 py-2 font-mono text-xs">v{d.version}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{hidden(d) ? '•••' : links(d).map(([, v]) => v).join(', ') || w.none}</td>
              <td className="px-2 py-2 text-xs text-mute">{hidden(d) ? '•••' : name(d.owner)}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{d.uploaded}</td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(d.state)}>{t.docState[d.state]}</Pill>
              </td>
              <td className="px-2 py-2">
                <Pill tone={d.access === 'restricted' ? 'warn' : 'neutral'}>{w.accessL[d.access]}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={!!doc} onClose={() => setSel(null)} title={doc ? `${doc.title} · v${doc.version}` : ''}>
        {doc && (
          <div className="space-y-5 text-sm">
            {hidden(doc) ? (
              <p className="rounded-lg border border-line px-3 py-2 text-mute">🔒 {t.common.restricted}</p>
            ) : (
              <>
                <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-xs">
                  <dt className="text-mute">{w.type}</dt>
                  <dd>{t.docType[doc.type]}</dd>
                  <dt className="text-mute">{w.ref}</dt>
                  <dd className="font-mono">{doc.ref}</dd>
                  <dt className="text-mute">{w.links}</dt>
                  <dd className="font-mono">{links(doc).map(([k, v]) => `${k}: ${v}`).join(' · ') || w.none}</dd>
                  <dt className="text-mute">{t.common.owner}</dt>
                  <dd>{name(doc.owner)}</dd>
                  <dt className="text-mute">{w.uploaded}</dt>
                  <dd className="font-mono">{doc.uploaded}</dd>
                  <dt className="text-mute">{w.access}</dt>
                  <dd>{w.accessL[doc.access]}</dd>
                  {doc.size != null && (
                    <>
                      <dt className="text-mute">{w.fileInfo}</dt>
                      <dd className="font-mono">{(doc.size / 1024 / 1024).toFixed(2)} MB</dd>
                    </>
                  )}
                </dl>

                {/* where it is in the workflow */}
                <div>
                  <p className="mb-2 text-xs text-mute">{w.flow}</p>
                  <ol className="flex flex-wrap items-center gap-1 text-xs">
                    {FLOW.map((s, k) => {
                      const at = FLOW.indexOf(doc.state);
                      const on = s === doc.state;
                      return (
                        <li key={s} className="flex items-center gap-1">
                          <span className={`rounded-full border px-2.5 py-1 ${on ? 'border-accent bg-accent/15 text-fg' : k < at ? 'border-emerald-400/40 text-emerald-300' : 'border-line text-mute'}`}>{t.docState[s]}</span>
                          {k < FLOW.length - 1 && <span className="text-mute">→</span>}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="flex flex-wrap gap-2">
                  {can('doc.upload') && doc.state === 'draft' && <Btn onClick={() => move(doc, 'review', 'submitted')}>{w.submit}</Btn>}
                  {can('doc.review') && doc.state === 'review' && (
                    <>
                      <Btn kind="primary" onClick={() => move(doc, 'approved', 'approved')}>
                        {w.approve}
                      </Btn>
                      <Btn kind="danger" onClick={() => move(doc, 'draft', 'returned')}>
                        {w.back}
                      </Btn>
                    </>
                  )}
                  {can('doc.upload') && doc.state !== 'superseded' && <Btn onClick={() => setForm({ base: doc.id })}>{w.newVersion}</Btn>}
                </div>

                <div>
                  <p className="mb-2 text-xs text-mute">{t.common.history}</p>
                  <History items={doc.history} name={name} />
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.base ? `${w.newVersion} · ${data.docs.find((d) => d.id === form.base)?.title ?? ''}` : w.upload}>
        {form && <UploadForm base={form.base} onDone={(id) => {
              setForm(null);
              setSel(id);
            }} />}
      </Drawer>
    </div>
  );
}

function UploadForm({ base, onDone }: { base: string | null; onDone: (id: string) => void }) {
  const t = useText();
  const w = useWords(W);
  const { data, change, user } = useStore();
  const prev = base ? data.docs.find((d) => d.id === base) ?? null : null;
  const [title, setTitle] = useState(prev?.title ?? '');
  const [type, setType] = useState<DocType>(prev?.type ?? 'drawing');
  const [ref, setRef] = useState(prev?.ref ?? '');
  const [access, setAccess] = useState<Access>(prev?.access ?? 'project');
  const [pkg, setPkg] = useState(prev?.links.pkg ?? '');
  const [file, setFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);

  const save = () => {
    const out: Problem[] = [];
    if (!title.trim()) out.push({ field: 'title', code: 'required' });
    if (!file) out.push({ field: 'file', code: 'required' });
    else out.push(...checkFile(file));
    setProblems(out);
    if (out.length) return;
    const id = nextId('D', data.docs.map((d) => d.id));
    const ok = change('doc.upload', id, prev ? `v${prev.version + 1} of ${prev.id}` : title, (d) => {
      if (prev) {
        const old = d.docs.find((x) => x.id === prev.id);
        if (old) {
          old.state = 'superseded';
          old.history.push({ at: stamp(), by: user, action: 'superseded', comment: id });
        }
      }
      d.docs.push({
        id,
        title: title.trim(),
        type,
        ref: ref.trim() || '—',
        version: prev ? prev.version + 1 : 1,
        links: { ...(prev?.links ?? {}), pkg: pkg || undefined },
        owner: user,
        uploaded: stamp(),
        state: 'draft',
        access,
        size: file!.size,
        history: [{ at: stamp(), by: user, action: 'registered', comment: file!.name }],
      });
    });
    if (ok) onDone(id);
    else setProblems([{ field: 'role', code: 'forbidden' }]);
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-sky-400/40 bg-sky-400/[0.07] px-3 py-2 text-xs text-sky-200">{w.noServer}</p>
      <Field label={w.title}>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Select label={w.type} value={type} onChange={setType} options={TYPES.map((x): [DocType, string] => [x, t.docType[x]])} />
        <Field label={w.ref}>
          <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Select label={w.access} value={access} onChange={setAccess} options={ACCESS.map((x): [Access, string] => [x, w.accessL[x]])} />
        <Select label={w.linkedPkg} value={pkg} onChange={setPkg} options={[['', w.none], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
      </div>
      <Field label={`${w.file} — ${w.allowed}`}>
        <input
          type="file"
          accept={FILE_TYPES.join(',')}
          className="text-xs text-fg file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-fg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ? { name: f.name, size: f.size, type: f.type } : null);
            setProblems(f ? checkFile(f) : []);
          }}
        />
      </Field>
      {file && (
        <p className="font-mono text-xs text-mute">
          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} / {FILE_MAX / 1024 / 1024} MB · {file.type || '?'}
        </p>
      )}
      <Problems list={problems} />
      <Btn kind="primary" onClick={save}>
        {t.common.save}
      </Btn>
    </div>
  );
}
