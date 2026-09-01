'use client'

// 조합(수리명×지역) 관리 대시보드.
// 정적 사이트지만 이 페이지는 브라우저에서 Supabase에 직접 읽고 쓴다.
// 쓰기는 RLS(public.is_admin: 운영자 이메일 검사)로 보호되므로 anon 키로 안전하다.
//
// ⚠️ 저장해도 공개 사이트에 바로 반영되지 않는다 — 정적 export라서
//    GitHub Actions의 Deploy 워크플로를 한 번 돌려야 다시 빌드된다.

import { useEffect, useMemo, useState } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Row {
  id: number
  decision: string
  meta_title: string | null
  meta_description: string | null
  repair_keyword_id: number
  region_id: number
  guide: unknown
}
interface Kw {
  id: number
  slug: string
  display_name: string
}
interface Rg {
  id: number
  display_name: string
  parent_id: number | null
  level: string
}

const ACTIONS_URL = 'https://github.com/playskang-svg/rsuri/actions/workflows/deploy.yml'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authErr, setAuthErr] = useState('')

  const [rows, setRows] = useState<Row[]>([])
  const [kws, setKws] = useState<Kw[]>([])
  const [rgs, setRgs] = useState<Rg[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [newKw, setNewKw] = useState<number | ''>('')
  const [newRg, setNewRg] = useState<number | ''>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function load() {
    const [p, k, r] = await Promise.all([
      supabase
        .from('suri_pages')
        .select('id, decision, meta_title, meta_description, repair_keyword_id, region_id, guide')
        .eq('page_type', 'LANDING')
        .order('id'),
      supabase.from('suri_repair_keywords').select('id, slug, display_name').order('display_name'),
      supabase.from('suri_regions').select('id, display_name, parent_id, level'),
    ])
    if (p.data) setRows(p.data as Row[])
    if (k.data) setKws(k.data as Kw[])
    if (r.data) setRgs(r.data as Rg[])
  }
  useEffect(() => {
    if (session) load()
  }, [session])

  const kwById = useMemo(() => new Map(kws.map((k) => [k.id, k])), [kws])
  const rgById = useMemo(() => new Map(rgs.map((r) => [r.id, r])), [rgs])
  const dongs = useMemo(() => rgs.filter((r) => r.level === 'DONG'), [rgs])

  const regionLabel = (id: number) => {
    const parts: string[] = []
    let cur = rgById.get(id)
    while (cur) {
      parts.unshift(cur.display_name)
      cur = cur.parent_id != null ? rgById.get(cur.parent_id) : undefined
    }
    return parts.join(' ')
  }

  const view = useMemo(() => {
    const q = filter.trim()
    return rows
      .map((row) => ({
        row,
        kw: kwById.get(row.repair_keyword_id)?.display_name ?? '?',
        rg: regionLabel(row.region_id),
      }))
      .filter((x) => !q || x.kw.includes(q) || x.rg.includes(q))
  }, [rows, filter, kwById, rgById])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setAuthErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthErr(error.message)
  }

  async function run(
    label: string,
    fn: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setBusy(true)
    setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg(`오류: ${error.message}`)
    else {
      setMsg(`${label} 완료 — 사이트 반영은 Deploy 워크플로 실행 후`)
      load()
    }
  }

  const toggleDecision = (row: Row) =>
    run(row.decision === 'CREATE' ? '숨김(HOLD)' : '발행(CREATE)', () =>
      supabase
        .from('suri_pages')
        .update({ decision: row.decision === 'CREATE' ? 'HOLD' : 'CREATE' })
        .eq('id', row.id),
    )

  const remove = (row: Row) => {
    if (!confirm('이 조합 페이지를 삭제할까요? (본문 섹션도 함께 삭제됩니다)')) return
    run('삭제', () => supabase.from('suri_pages').delete().eq('id', row.id))
  }

  const saveEdit = () => {
    if (!editing) return
    run('수정', () =>
      supabase
        .from('suri_pages')
        .update({ meta_title: editing.meta_title, meta_description: editing.meta_description })
        .eq('id', editing.id),
    ).then(() => setEditing(null))
  }

  const addCombo = () => {
    if (newKw === '' || newRg === '') return
    const kw = kwById.get(newKw as number)!
    const label = `${regionLabel(newRg as number)} ${kw.display_name}`
    run('추가', () =>
      supabase.from('suri_pages').insert({
        page_type: 'LANDING',
        content_type: 'CT1',
        repair_keyword_id: newKw,
        region_id: newRg,
        search_intent: `${label} 안내`,
        required_modules: ['M01', 'M24'],
        module_order: ['M01', 'M24'],
        meta_title: `${label} | 수리위키`,
        meta_description: `${label} 출장 상담 안내. 사진과 수리 내용을 남겨 주시면 확인 후 안내드립니다.`,
        decision: 'CREATE',
      }),
    )
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-sm px-4 py-20">
        <h1 className="font-serif-kr text-2xl font-black">관리 로그인</h1>
        <form onSubmit={signIn} className="card mt-6 space-y-3 p-5">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5"
          />
          {authErr && <p className="text-sm font-bold text-[var(--danger-ink)]">{authErr}</p>}
          <button type="submit" className="btn-call w-full">
            로그인
          </button>
          <p className="text-xs text-[var(--ink-soft)]">
            계정은 Supabase 대시보드 → Authentication → Add user 로 만듭니다. 쓰기 권한은
            운영자 이메일에만 있습니다.
          </p>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif-kr text-2xl font-black">조합 관리</h1>
        <div className="flex items-center gap-2">
          <a href={ACTIONS_URL} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-sm">
            사이트 재배포(Actions) ↗
          </a>
          <button onClick={() => supabase.auth.signOut()} className="nav-link">
            로그아웃
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        수리명×지역 조합 {rows.length}건 · 저장 후 공개 사이트 반영은{' '}
        <b>Deploy 워크플로 실행</b>이 필요합니다.
      </p>
      {msg && (
        <p className="mt-3 rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm font-bold text-[var(--teal)]">
          {msg}
        </p>
      )}

      {/* 새 조합 추가 */}
      <div className="card mt-6 flex flex-wrap items-center gap-2 p-4">
        <select
          value={newKw}
          onChange={(e) => setNewKw(e.target.value ? Number(e.target.value) : '')}
          className="min-w-56 flex-1 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
        >
          <option value="">수리명 선택…</option>
          {kws.map((k) => (
            <option key={k.id} value={k.id}>
              {k.display_name}
            </option>
          ))}
        </select>
        <select
          value={newRg}
          onChange={(e) => setNewRg(e.target.value ? Number(e.target.value) : '')}
          className="min-w-44 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
        >
          <option value="">지역(동) 선택…</option>
          {dongs.map((d) => (
            <option key={d.id} value={d.id}>
              {regionLabel(d.id)}
            </option>
          ))}
        </select>
        <button onClick={addCombo} disabled={busy || newKw === '' || newRg === ''} className="btn-call !py-2.5 text-sm disabled:opacity-40">
          + 조합 추가
        </button>
      </div>

      {/* 필터 + 목록 */}
      <input
        placeholder="수리명·지역 검색"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mt-5 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
      />

      <ul className="mt-4 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-white">
        {view.map(({ row, kw, rg }) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span
              className={`w-14 rounded-full px-2 py-0.5 text-center text-[11px] font-black ${
                row.decision === 'CREATE'
                  ? 'bg-[var(--teal-soft)] text-[var(--teal)]'
                  : 'bg-[var(--danger-bg)] text-[var(--danger-ink)]'
              }`}
            >
              {row.decision === 'CREATE' ? '발행' : '숨김'}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <b>{rg}</b> {kw}
              {row.guide ? <span className="ml-1.5 text-[11px] font-bold text-[var(--copper)]">상세본</span> : null}
            </span>
            <span className="flex gap-1.5 text-[13px] font-bold">
              <button onClick={() => setEditing({ ...row })} className="rounded-md px-2 py-1 hover:bg-[var(--teal-soft)]">
                수정
              </button>
              <button onClick={() => toggleDecision(row)} disabled={busy} className="rounded-md px-2 py-1 hover:bg-[var(--teal-soft)]">
                {row.decision === 'CREATE' ? '숨김' : '발행'}
              </button>
              <button onClick={() => remove(row)} disabled={busy} className="rounded-md px-2 py-1 text-[var(--danger-ink)] hover:bg-[var(--danger-bg)]">
                삭제
              </button>
            </span>
          </li>
        ))}
      </ul>

      {/* 수정 패널 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
          <div className="card w-full max-w-lg space-y-3 p-5">
            <h2 className="font-serif-kr text-lg font-black">메타 수정</h2>
            <label className="block text-sm font-bold">
              제목
              <input
                value={editing.meta_title ?? ''}
                onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal"
              />
            </label>
            <label className="block text-sm font-bold">
              설명
              <textarea
                rows={3}
                value={editing.meta_description ?? ''}
                onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost !py-2 text-sm">
                취소
              </button>
              <button onClick={saveEdit} disabled={busy} className="btn-call !py-2 text-sm">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
