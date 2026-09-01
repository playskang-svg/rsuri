'use client'

// 조합(수리명×지역) 관리 대시보드.
// 정적 사이트지만 이 페이지는 브라우저에서 Supabase에 직접 읽고 쓴다.
// 쓰기는 RLS(public.is_admin: 운영자 이메일 검사)로 보호되므로 anon 키로 안전하다.
//
// 화면 구조: 키워드(수리명)가 블럭이고, 그 밑에 지역을 붙이면 조합 페이지가 생긴다.
// 붙이는 즉시 DB에는 반영되지만 공개 사이트는 정적 export라 Deploy 워크플로를
// 한 번 돌려야 실제로 빌드된다 — 조합마다 배포할 수는 없어서 모아서 한 번에 굽는다.

import { useEffect, useMemo, useState } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import { toSlug } from '@/lib/romanize'

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
  category_id: number
}
interface Cat {
  id: number
  display_name: string
  sort_order: number
}
interface Rg {
  id: number
  display_name: string
  parent_id: number | null
  level: string
}
interface Img {
  id: number
  page_id: number
  role: string
  url: string
  overlay_note: string | null
  sort_order: number
}

const ACTIONS_URL = 'https://github.com/playskang-svg/rsuri/actions/workflows/deploy.yml'
const BUCKET = 'page-images'
const ROLES = ['BEFORE', 'PROCESS', 'AFTER', 'MATERIAL', 'TOOL'] as const
const ROLE_LABEL: Record<string, string> = {
  BEFORE: '시공 전',
  PROCESS: '시공 중',
  AFTER: '시공 후',
  MATERIAL: '자재',
  TOOL: '장비',
  EXCLUDE: '숨김',
}

// 아이디만 입력했을 때 붙일 계정 도메인 (admin → admin@suriwiki.com)
const ADMIN_DOMAIN = 'suriwiki.com'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authErr, setAuthErr] = useState('')

  const [rows, setRows] = useState<Row[]>([])
  const [kws, setKws] = useState<Kw[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [rgs, setRgs] = useState<Rg[]>([])
  const [imgs, setImgs] = useState<Img[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)

  // 지역 붙이기 패널을 연 키워드 id, 그리고 그 안에서 고른 지역들
  const [attachKw, setAttachKw] = useState<number | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [customRgText, setCustomRgText] = useState('')

  // 새 수리명(키워드) 만들기 패널
  const [newKwOpen, setNewKwOpen] = useState(false)
  const [newKwName, setNewKwName] = useState('')
  const [newKwDesc, setNewKwDesc] = useState('')
  const [newKwCat, setNewKwCat] = useState<number | ''>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function load() {
    const [p, k, c, r, i] = await Promise.all([
      supabase
        .from('suri_pages')
        .select('id, decision, meta_title, meta_description, repair_keyword_id, region_id, guide')
        .eq('page_type', 'LANDING')
        .order('id'),
      supabase
        .from('suri_repair_keywords')
        .select('id, slug, display_name, category_id')
        .order('display_name'),
      supabase.from('suri_categories').select('id, display_name, sort_order').order('sort_order'),
      supabase.from('suri_regions').select('id, display_name, parent_id, level'),
      supabase.from('suri_page_images').select('id, page_id, role, url, overlay_note, sort_order'),
    ])
    if (p.data) setRows(p.data as Row[])
    if (k.data) setKws(k.data as Kw[])
    if (c.data) setCats(c.data as Cat[])
    if (r.data) setRgs(r.data as Rg[])
    if (i.data) setImgs(i.data as Img[])
  }
  useEffect(() => {
    if (session) load()
  }, [session])

  const kwById = useMemo(() => new Map(kws.map((k) => [k.id, k])), [kws])
  const rgById = useMemo(() => new Map(rgs.map((r) => [r.id, r])), [rgs])

  const regionLabel = (id: number) => {
    const parts: string[] = []
    let cur = rgById.get(id)
    while (cur) {
      parts.unshift(cur.display_name)
      cur = cur.parent_id != null ? rgById.get(cur.parent_id) : undefined
    }
    return parts.join(' ')
  }

  // 동까지 나눈 지역(서울·경기)과 시·군 단위로만 운영하는 지역(대구·경북)이 섞여 있다.
  // 레벨로 거르면 후자를 조합에 못 쓰므로 전 레벨을 노출하고 전체 경로로 구분한다.
  const selectableRegions = useMemo(
    () => [...rgs].sort((a, b) => regionLabel(a.id).localeCompare(regionLabel(b.id), 'ko')),
    [rgs, rgById],
  )

  const rowsByKw = useMemo(() => {
    const m = new Map<number, Row[]>()
    for (const row of rows) {
      if (!m.has(row.repair_keyword_id)) m.set(row.repair_keyword_id, [])
      m.get(row.repair_keyword_id)!.push(row)
    }
    for (const list of m.values())
      list.sort((a, b) => regionLabel(a.region_id).localeCompare(regionLabel(b.region_id), 'ko'))
    return m
  }, [rows, rgById])

  const imgsByPage = useMemo(() => {
    const m = new Map<number, Img[]>()
    for (const im of imgs) {
      if (!m.has(im.page_id)) m.set(im.page_id, [])
      m.get(im.page_id)!.push(im)
    }
    for (const list of m.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    return m
  }, [imgs])

  // 키워드 블럭을 카테고리별로 묶는다. 검색어는 수리명·지역 양쪽에 건다.
  const blocks = useMemo(() => {
    const q = filter.trim()
    const catById = new Map(cats.map((c) => [c.id, c]))
    const visible = kws.filter((k) => {
      if (!q) return true
      if (k.display_name.includes(q)) return true
      return (rowsByKw.get(k.id) ?? []).some((r) => regionLabel(r.region_id).includes(q))
    })
    const grouped = new Map<number, { cat: Cat | undefined; items: Kw[] }>()
    for (const k of visible) {
      if (!grouped.has(k.category_id))
        grouped.set(k.category_id, { cat: catById.get(k.category_id), items: [] })
      grouped.get(k.category_id)!.items.push(k)
    }
    return [...grouped.values()].sort(
      (a, b) => (a.cat?.sort_order ?? 999) - (b.cat?.sort_order ?? 999),
    )
  }, [kws, cats, filter, rowsByKw, rgById])

  // Supabase Auth는 이메일만 받지만 운영자는 'admin'처럼 짧은 아이디로 들어온다.
  // @가 없으면 기본 도메인을 붙여 계정 이메일로 되돌린다.
  function toEmail(id: string) {
    const v = id.trim()
    return v.includes('@') ? v : `${v}@${ADMIN_DOMAIN}`
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setAuthErr('')
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(email),
      password,
    })
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
      await load()
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
    if (!confirm('이 조합 페이지를 삭제할까요? (본문 섹션·사진도 함께 삭제됩니다)')) return
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

  // 고른 지역들을 한 번에 붙인다. 이미 있는 조합은 유니크 제약에 걸리므로 미리 걸러낸다.
  const attachRegions = (kwId: number) => {
    const existing = new Set((rowsByKw.get(kwId) ?? []).map((r) => r.region_id))
    const targets = [...picked].filter((id) => !existing.has(id))
    if (targets.length === 0) {
      setMsg('이미 붙어 있는 지역만 선택되어 추가할 것이 없습니다.')
      return
    }
    const kw = kwById.get(kwId)!
    const payload = targets.map((regionId) => {
      const label = `${regionLabel(regionId)} ${kw.display_name}`
      return {
        page_type: 'LANDING',
        content_type: 'CT1',
        repair_keyword_id: kwId,
        region_id: regionId,
        search_intent: `${label} 안내`,
        required_modules: ['M01', 'M24'],
        module_order: ['M01', 'M24'],
        meta_title: `${label} | 수리위키`,
        meta_description: `${label} 출장 상담 안내. 사진과 수리 내용을 남겨 주시면 확인 후 안내드립니다.`,
        decision: 'CREATE',
      }
    })
    run(`${targets.length}개 지역 붙이기`, () =>
      supabase.from('suri_pages').insert(payload),
    ).then(() => {
      setPicked(new Set())
      setAttachKw(null)
    })
  }

  // 새 수리명(키워드)을 만든다. 슬러그가 그대로 URL의 첫 구간이 되므로
  // 한글 이름을 로마자로 옮겨 쓴다 (비둘기 퇴치 → bidulgi-toechi).
  // 여러 줄을 넣으면 한 번에 여러 개를 만든다.
  const createKeywords = () => {
    if (newKwCat === '' || newKwName.trim() === '') return
    const names = newKwName
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) return

    run(`수리명 ${names.length}개 추가`, async () => {
      for (const name of names) {
        const base = toSlug(name) || 'keyword'
        let slug = base
        for (let n = 2; ; n++) {
          const { data: taken } = await supabase
            .from('suri_repair_keywords')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()
          if (!taken) break
          slug = `${base}-${n}`
        }
        const { error } = await supabase.from('suri_repair_keywords').insert({
          category_id: newKwCat,
          slug,
          display_name: name,
          description: names.length === 1 && newKwDesc.trim() ? newKwDesc.trim() : null,
        })
        if (error) return { error }
      }
      return { error: null }
    }).then(() => {
      setNewKwName('')
      setNewKwDesc('')
      setNewKwOpen(false)
    })
  }

  // 자유 텍스트(또는 파일 복붙)로 지역을 일괄 생성해서 붙인다.
  const attachCustomRegions = (kwId: number) => {
    if (customRgText.trim() === '') return
    const kw = kwById.get(kwId)!
    const regionNames = customRgText
      .split(/[\n,]+/)
      .map((r) => r.trim())
      .filter(Boolean)

    if (regionNames.length === 0) return

    run(`${regionNames.length}개 커스텀 지역 붙이기`, async () => {
      for (const rName of regionNames) {
        let regionId = 0
        const { data: existing } = await supabase
          .from('suri_regions')
          .select('id')
          .eq('display_name', rName)
          .maybeSingle()

        if (existing) {
          regionId = existing.id
        } else {
          // 슬러그가 그대로 URL 경로가 된다. 타임스탬프를 쓰면
          // /pigeon-control/custom-1788251196-4821 같은 주소가 검색에 노출된다.
          const base = toSlug(rName) || 'region'
          let slug = base
          for (let n = 2; ; n++) {
            const { data: taken } = await supabase
              .from('suri_regions')
              .select('id')
              .eq('slug', slug)
              .is('parent_id', null)
              .maybeSingle()
            if (!taken) break
            slug = `${base}-${n}`
          }
          const { data: newReg, error: regErr } = await supabase
            .from('suri_regions')
            .insert({ display_name: rName, level: 'CUSTOM', slug })
            .select('id')
            .single()

          if (regErr) return { error: regErr }
          regionId = newReg.id
        }

        const label = `${rName} ${kw.display_name}`
        const { error: pageErr } = await supabase.from('suri_pages').insert({
          page_type: 'LANDING',
          content_type: 'CT1',
          repair_keyword_id: kwId,
          region_id: regionId,
          search_intent: `${label} 안내`,
          required_modules: ['M01', 'M24'],
          module_order: ['M01', 'M24'],
          meta_title: `${label} | 수리위키`,
          meta_description: `${label} 출장 상담 안내. 사진과 수리 내용을 남겨 주시면 확인 후 안내드립니다.`,
          decision: 'CREATE',
        })
        if (pageErr && pageErr.code !== '23505') return { error: pageErr }
      }
      return { error: null }
    }).then(() => {
      setCustomRgText('')
    })
  }

  // 스토리지에 올린 뒤 공개 URL을 suri_page_images에 기록한다.
  // 사이트가 정적이라 이 URL은 다음 빌드 때 HTML에 박힌다.
  async function uploadImage(pageId: number, file: File, role: string) {
    setBusy(true)
    setMsg('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${pageId}/${role}-${Date.now()}.${ext}`
    const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (up.error) {
      setBusy(false)
      setMsg(`업로드 실패: ${up.error.message}`)
      return
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const sort = (imgsByPage.get(pageId) ?? []).length
    const ins = await supabase
      .from('suri_page_images')
      .insert({ page_id: pageId, role, url: data.publicUrl, sort_order: sort })
    setBusy(false)
    if (ins.error) setMsg(`사진 등록 실패: ${ins.error.message}`)
    else {
      setMsg('사진 등록 완료 — 사이트 반영은 Deploy 워크플로 실행 후')
      await load()
    }
  }

  const removeImage = (im: Img) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    run('사진 삭제', () => supabase.from('suri_page_images').delete().eq('id', im.id))
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-sm px-4 py-20">
        <h1 className="font-serif-kr text-2xl font-black">관리 로그인</h1>
        <form onSubmit={signIn} className="card mt-6 space-y-3 p-5">
          <input
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="아이디"
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
            아이디만 입력하면 @{ADMIN_DOMAIN}이 자동으로 붙습니다. 계정은 Supabase 대시보드 →
            Authentication → Add user 로 만들고, 쓰기 권한은 운영자 계정에만 있습니다.
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
        수리명 {kws.length}개 · 조합 {rows.length}건 · 지역을 붙이면 바로 저장되지만, 공개 사이트
        반영은 <b>Deploy 워크플로 실행</b>이 필요합니다.
      </p>
      {msg && (
        <p className="mt-3 rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm font-bold text-[var(--teal)]">
          {msg}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <input
          placeholder="수리명·지역 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => setNewKwOpen((v) => !v)}
          className="btn-ghost shrink-0 !py-2 text-sm"
        >
          {newKwOpen ? '닫기' : '+ 수리명 만들기'}
        </button>
      </div>

      {newKwOpen && (
        <div className="card mt-3 space-y-2 p-4">
          <p className="text-sm font-bold">새 수리명 만들기</p>
          <select
            value={newKwCat}
            onChange={(e) => setNewKwCat(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
          >
            <option value="">분야 선택…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
          <textarea
            rows={3}
            placeholder={'수리명 (여러 개는 줄바꿈 또는 쉼표로 구분)\n예: 비둘기 퇴치, 욕조 트랩 교체'}
            value={newKwName}
            onChange={(e) => setNewKwName(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
          />
          <input
            placeholder="한 줄 설명 (선택 — 페이지 상단에 나옵니다. 1개만 만들 때 적용)"
            value={newKwDesc}
            onChange={(e) => setNewKwDesc(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
          />
          {newKwName.trim() && (
            <p className="text-xs text-[var(--ink-soft)]">
              주소: <code>/{toSlug(newKwName.split(/[\n,]+/)[0].trim()) || 'keyword'}</code>
            </p>
          )}
          <button
            onClick={createKeywords}
            disabled={busy || newKwCat === '' || newKwName.trim() === ''}
            className="btn-call w-full !py-2 text-sm disabled:opacity-40"
          >
            만들기
          </button>
        </div>
      )}

      {blocks.map(({ cat, items }) => (
        <section key={cat?.id ?? 0} className="mt-8">
          <h2 className="eyebrow">{cat?.display_name ?? '미분류'}</h2>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {items.map((k) => {
              const attached = rowsByKw.get(k.id) ?? []
              const open = attachKw === k.id
              return (
                <div key={k.id} className="card flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold leading-snug">{k.display_name}</h3>
                    <span className="shrink-0 rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[11px] font-black text-[var(--teal)]">
                      {attached.length}
                    </span>
                  </div>

                  {attached.length === 0 ? (
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      아직 붙인 지역이 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {attached.map((row) => {
                        const shots = imgsByPage.get(row.id) ?? []
                        return (
                          <li key={row.id}>
                            <button
                              onClick={() => setEditing({ ...row })}
                              title="눌러서 메타 수정·사진 관리"
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                row.decision === 'CREATE'
                                  ? 'bg-[var(--teal-soft)] text-[var(--teal)]'
                                  : 'bg-[var(--danger-bg)] text-[var(--danger-ink)]'
                              }`}
                            >
                              {regionLabel(row.region_id)}
                              {shots.length > 0 && (
                                <span className="ml-1 opacity-70">📷{shots.length}</span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <button
                    onClick={() => {
                      setAttachKw(open ? null : k.id)
                      setPicked(new Set())
                    }}
                    className="btn-ghost mt-3 !py-1.5 text-xs"
                  >
                    {open ? '닫기' : '+ 지역 붙이기'}
                  </button>

                  {open && (
                    <div className="mt-3 rounded-lg border border-[var(--line)] p-2">
                      <div className="max-h-52 overflow-y-auto">
                        {selectableRegions.map((r) => {
                          const already = attached.some((a) => a.region_id === r.id)
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs ${
                                already ? 'opacity-40' : 'hover:bg-[var(--teal-soft)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={already}
                                checked={picked.has(r.id)}
                                onChange={(e) => {
                                  const next = new Set(picked)
                                  if (e.target.checked) next.add(r.id)
                                  else next.delete(r.id)
                                  setPicked(next)
                                }}
                              />
                              <span>{regionLabel(r.id)}</span>
                              {already && <span className="text-[10px]">붙어 있음</span>}
                            </label>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => attachRegions(k.id)}
                        disabled={busy || picked.size === 0}
                        className="btn-call mt-2 w-full !py-2 text-xs disabled:opacity-40"
                      >
                        선택한 {picked.size}개 지역 붙이기
                      </button>
                      
                      <hr className="my-3 border-[var(--line)]" />
                      
                      <textarea
                        value={attachKw === k.id ? customRgText : ''}
                        onChange={(e) => setCustomRgText(e.target.value)}
                        placeholder="자유 지역명 입력 (예: 천안 불당, 천안 쌍용)&#10;콤마(,) 또는 줄바꿈으로 일괄 추가 가능"
                        rows={3}
                        className="w-full rounded border border-[var(--line)] px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => attachCustomRegions(k.id)}
                        disabled={busy || customRgText.trim() === '' || attachKw !== k.id}
                        className="mt-2 w-full rounded bg-[var(--teal-soft)] py-2 text-xs font-bold text-[var(--teal)] hover:opacity-80 disabled:opacity-40"
                      >
                        입력한 새 지역 붙이기
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* 조합 상세 — 메타 수정 + 사진 관리 */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal
        >
          <div className="card my-8 w-full max-w-lg space-y-3 p-5">
            <h2 className="font-serif-kr text-lg font-black">
              {regionLabel(editing.region_id)} {kwById.get(editing.repair_keyword_id)?.display_name}
            </h2>

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

            <div className="border-t border-[var(--line)] pt-3">
              <p className="text-sm font-bold">현장 사진</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                올린 사진이 페이지 상단·본문의 참고 이미지를 대체합니다. 순서대로 2장까지
                노출됩니다.
              </p>

              <ul className="mt-2 space-y-2">
                {(imgsByPage.get(editing.id) ?? []).map((im) => (
                  <li key={im.id} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={im.url}
                      alt=""
                      className="h-12 w-16 rounded object-cover"
                      loading="lazy"
                    />
                    <span className="flex-1 text-xs font-bold">{ROLE_LABEL[im.role] ?? im.role}</span>
                    <button
                      onClick={() => removeImage(im)}
                      disabled={busy}
                      className="rounded-md px-2 py-1 text-xs font-bold text-[var(--danger-ink)] hover:bg-[var(--danger-bg)]"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <label
                    key={role}
                    className="btn-ghost cursor-pointer !py-1.5 text-xs"
                    aria-disabled={busy}
                  >
                    + {ROLE_LABEL[role]}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) uploadImage(editing.id, file, role)
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--line)] pt-3">
              <div className="flex gap-1.5 text-[13px] font-bold">
                <button
                  onClick={() => toggleDecision(editing)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 hover:bg-[var(--teal-soft)]"
                >
                  {editing.decision === 'CREATE' ? '숨김' : '발행'}
                </button>
                <button
                  onClick={() => {
                    remove(editing)
                    setEditing(null)
                  }}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-[var(--danger-ink)] hover:bg-[var(--danger-bg)]"
                >
                  삭제
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="btn-ghost !py-2 text-sm">
                  닫기
                </button>
                <button onClick={saveEdit} disabled={busy} className="btn-call !py-2 text-sm">
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
