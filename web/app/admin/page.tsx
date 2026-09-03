'use client'

// 키워드 관리 대시보드.
// 정적 사이트지만 이 페이지는 브라우저에서 Supabase에 직접 읽고 쓴다.
// 쓰기는 RLS(public.is_admin: 운영자 이메일 검사)로 보호되므로 anon 키로 안전하다.
//
// 화면 구조: 키워드가 최상위 블럭이고, 그 밑에 지역을 붙이면 지역 페이지가 생긴다.
// '분야'는 여기서 다루지 않는다 — 스키마의 category_id는 NOT NULL이라 남아 있지만
// 새 키워드는 전부 slug='general' 한 곳에 자동으로 붙는다.
// 사진은 키워드 단위로 세트를 만들고 그 키워드의 모든 지역 페이지가 상속받는다.
//
// 붙이는 즉시 DB에는 반영되지만 공개 사이트는 정적 export라 Deploy 워크플로를
// 한 번 돌려야 실제로 빌드된다 — 조합마다 배포할 수는 없어서 모아서 한 번에 굽는다.

import { useEffect, useMemo, useState } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import { toSlug } from '@/lib/romanize'
import type { KeywordImage, KeywordImageRole } from '@/lib/types'

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
  description: string | null
  category_id: number
}
interface RegionProfile {
  type: string
  near: string
  note: string
  dongs: string
}

interface Rg {
  id: number
  display_name: string
  parent_id: number | null
  level: string
  profile: RegionProfile | null
}

// 지역 유형 — web/lib/compose-local.ts가 이 값으로 키워드 문장 풀에서 변주를 고른다.
// 여기 없는 값을 넣으면 그 지역은 조립이 실패해 페이지가 비어 버린다.
const REGION_TYPES: { value: string; label: string }[] = [
  { value: 'seoul-gangnam', label: '강남권 (고층 아파트·오피스텔)' },
  { value: 'seoul-apt', label: '서울 대단지 아파트' },
  { value: 'seoul-old', label: '서울 구축·다세대' },
  { value: 'newtown1', label: '1기 신도시 (30년차)' },
  { value: 'newtown2', label: '2기 신도시·택지 (신축)' },
  { value: 'incheon', label: '인천 (구축·신축 혼재)' },
  { value: 'gyeonggi-mixed', label: '경기 (아파트·빌라·단독 혼재)' },
  { value: 'province', label: '수도권 밖' },
]
interface Img {
  id: number
  page_id: number
  role: string
  url: string
  overlay_note: string | null
  sort_order: number
}

/** 화면에서 다루는 사진 세트 한 벌. DB에는 set_no가 같은 여러 행으로 흩어져 있다. */
interface PhotoSetView {
  setNo: number
  before: KeywordImage | null
  after: KeywordImage | null
  process: KeywordImage[]
  caption: string
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
const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,image/avif'

// 아이디만 입력했을 때 붙일 계정 도메인 (admin → admin@suriwiki.com)
const ADMIN_DOMAIN = 'suriwiki.com'

// PostgREST는 .range() 없이 select만 하면 결과를 에러 없이 1000행에서 조용히 자른다.
// 지역 페이지가 1,300건을 넘어 이미 그 선을 지났으므로 전부 페이지네이션으로 받는다.
// web/lib/supabase.ts의 fetchAllRows와 같은 방식이지만 그 파일은 서버 전용이라 여기서 다시 만든다.
//
// 이 함수를 쓰는 모든 조회는 반드시 .order()로 순서를 못박아야 한다.
// Postgres는 ORDER BY 없는 LIMIT/OFFSET의 행 순서를 보장하지 않아서, 1000행을 넘는 순간
// 두 번째 range 요청이 다른 순서로 응답해 행이 중복되거나 누락된다.
// 정렬 키가 중복될 수 있으면(display_name 등) 마지막에 .order('id')로 동점을 깬다.
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null
    error: { message: string } | null
  }>,
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

/** 첫 세트의 시공 후 사진. 없으면 전/과정으로 내려간다 — 공개 사이트의 대표 이미지와 같은 규칙. */
function coverOf(sets: PhotoSetView[]): string | null {
  const first = sets[0]
  if (!first) return null
  return first.after?.url ?? first.before?.url ?? first.process[0]?.url ?? null
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authErr, setAuthErr] = useState('')

  const [rows, setRows] = useState<Row[]>([])
  const [kws, setKws] = useState<Kw[]>([])
  const [rgs, setRgs] = useState<Rg[]>([])
  const [imgs, setImgs] = useState<Img[]>([])
  const [kwImgs, setKwImgs] = useState<KeywordImage[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)

  // 지역 붙이기 패널을 연 키워드 id, 그리고 그 안에서 고른 지역들
  const [attachKw, setAttachKw] = useState<number | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [customRgText, setCustomRgText] = useState('')
  const [regionQuery, setRegionQuery] = useState('')

  // ── 지역 프로필 ──
  // 지역만 추가하면 페이지는 HOLD로 남는다. 본문을 조립할 재료(주거 유형·인접 지역·
  // 주거 특성·대표 동)가 있어야 발행되므로, 그 입력을 여기서 받는다.
  const [pfPanel, setPfPanel] = useState(false)
  const [pfQuery, setPfQuery] = useState('')
  const [pfOnlyMissing, setPfOnlyMissing] = useState(true)
  const [pfEdit, setPfEdit] = useState<number | null>(null)
  const [pfDraft, setPfDraft] = useState<RegionProfile>({ type: '', near: '', note: '', dongs: '' })

  // 새 키워드 만들기 패널
  const [newKwOpen, setNewKwOpen] = useState(false)
  const [newKwName, setNewKwName] = useState('')
  const [newKwDesc, setNewKwDesc] = useState('')

  // 키워드 편집 패널 (이름 / 한 줄 설명 / 주소)
  const [editKw, setEditKw] = useState<number | null>(null)
  const [kwName, setKwName] = useState('')
  const [kwDesc, setKwDesc] = useState('')
  const [kwSlug, setKwSlug] = useState('')

  // 사진 세트 패널
  const [photoKw, setPhotoKw] = useState<number | null>(null)
  // 사진이 하나도 없는 세트는 DB에 행이 없다 — 화면에만 존재하는 세트 번호를 여기에 둔다.
  const [draftSets, setDraftSets] = useState<Record<number, number[]>>({})
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function load() {
    try {
      const [p, k, r, i] = await Promise.all([
        fetchAll<Row>((a, b) =>
          supabase
            .from('suri_pages')
            .select(
              'id, decision, meta_title, meta_description, repair_keyword_id, region_id, guide',
            )
            .eq('page_type', 'LANDING')
            .order('id')
            .range(a, b),
        ),
        fetchAll<Kw>((a, b) =>
          supabase
            .from('suri_repair_keywords')
            .select('id, slug, display_name, description, category_id')
            .order('display_name')
            .order('id')
            .range(a, b),
        ),
        fetchAll<Rg>((a, b) =>
          supabase
            .from('suri_regions')
            .select('id, display_name, parent_id, level, profile')
            .order('id')
            .range(a, b),
        ),
        fetchAll<Img>((a, b) =>
          supabase
            .from('suri_page_images')
            .select('id, page_id, role, url, overlay_note, sort_order')
            .order('id')
            .range(a, b),
        ),
      ])
      setRows(p)
      setKws(k)
      setRgs(r)
      setImgs(i)
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`)
      return
    }
    // 마이그레이션(20260902_keyword_images.sql)을 아직 적용하지 않은 DB에서도
    // 나머지 관리 기능은 그대로 돌아가야 한다 — 이 조회 실패는 삼킨다.
    try {
      setKwImgs(
        await fetchAll<KeywordImage>((a, b) =>
          supabase
            .from('suri_keyword_images')
            .select('id, repair_keyword_id, set_no, role, url, caption, sort_order')
            .order('set_no')
            .order('sort_order')
            .order('id')
            .range(a, b),
        ),
      )
    } catch {
      setKwImgs([])
    }
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

  // 키워드 사진 행을 set_no별로 접어 화면이 쓰는 세트 모양으로 만든다.
  const setsByKw = useMemo(() => {
    const m = new Map<number, PhotoSetView[]>()
    for (const im of kwImgs) {
      if (!m.has(im.repair_keyword_id)) m.set(im.repair_keyword_id, [])
      const list = m.get(im.repair_keyword_id)!
      let s = list.find((x) => x.setNo === im.set_no)
      if (!s) {
        s = { setNo: im.set_no, before: null, after: null, process: [], caption: '' }
        list.push(s)
      }
      if (im.role === 'BEFORE') s.before = im
      else if (im.role === 'AFTER') s.after = im
      else s.process.push(im)
      if (!s.caption && im.caption) s.caption = im.caption
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.setNo - b.setNo)
      for (const s of list) s.process.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    }
    return m
  }, [kwImgs])

  // 검색어는 키워드 이름·지역 양쪽에 건다. 분야 묶음은 더 이상 쓰지 않는다.
  const visibleKws = useMemo(() => {
    const q = filter.trim()
    if (!q) return kws
    return kws.filter((k) => {
      if (k.display_name.includes(q) || k.slug.includes(q)) return true
      return (rowsByKw.get(k.id) ?? []).some((r) => regionLabel(r.region_id).includes(q))
    })
  }, [kws, filter, rowsByKw, rgById])

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

  // 성공/실패를 호출부가 구분할 수 있게 error를 그대로 돌려준다.
  // 프로필을 저장하면 그 지역에서 조립이 가능해진 페이지를 발행으로 되돌린다.
  // 저장만 하고 HOLD로 남겨 두면 "입력했는데 왜 사이트에 안 나오냐"가 반복된다.
  async function saveProfile(rg: Rg) {
    const draft = {
      type: pfDraft.type.trim(),
      near: pfDraft.near.trim(),
      note: pfDraft.note.trim().replace(/[.。]$/, ''),
      dongs: pfDraft.dongs.trim(),
    }
    if (!draft.type || !draft.near || !draft.note || !draft.dongs) {
      setMsg('오류: 네 칸을 모두 채워야 본문이 조립됩니다')
      return
    }
    setBusy(true)
    setMsg('')

    const up = await supabase.from('suri_regions').update({ profile: draft }).eq('id', rg.id)
    if (up.error) {
      setBusy(false)
      setMsg(`오류: ${up.error.message}`)
      return
    }

    // 이 유형의 문장 풀을 가진 키워드만 발행 대상이다. angles에 없는 유형이면 조립이
    // 실패해 빈 페이지가 나오므로, 그런 조합은 HOLD로 둔다.
    const kwRes = await supabase.from('suri_repair_keywords').select('id, content')
    const okKwIds = (kwRes.data ?? [])
      .filter((k: { content: { local_pool?: { angles?: Record<string, string> } } | null }) =>
        Boolean(k.content?.local_pool?.angles?.[draft.type]),
      )
      .map((k: { id: number }) => k.id)

    let published = 0
    if (okKwIds.length > 0) {
      const pub = await supabase
        .from('suri_pages')
        .update({ decision: 'CREATE' })
        .eq('region_id', rg.id)
        .eq('page_type', 'LANDING')
        .eq('decision', 'HOLD')
        .in('repair_keyword_id', okKwIds)
        .select('id')
      if (pub.error) {
        setBusy(false)
        setMsg(`프로필은 저장됐지만 발행 전환 실패: ${pub.error.message}`)
        return
      }
      published = pub.data?.length ?? 0
    }

    setBusy(false)
    setPfEdit(null)
    setMsg(
      `${rg.display_name} 프로필 저장 — ${published}건 발행 전환. 사이트 반영은 Deploy 워크플로 실행 후`,
    )
    await load()
  }

  async function run(
    label: string,
    fn: () => PromiseLike<{ error: { message: string } | null }>,
  ): Promise<{ error: { message: string } | null }> {
    setBusy(true)
    setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg(`오류: ${error.message}`)
    else {
      setMsg(`${label} 완료 — 사이트 반영은 Deploy 워크플로 실행 후`)
      await load()
    }
    return { error }
  }

  const toggleDecision = async (row: Row) => {
    const next = row.decision === 'CREATE' ? 'HOLD' : 'CREATE'
    const { error } = await run(next === 'HOLD' ? '숨김(HOLD)' : '발행(CREATE)', () =>
      supabase.from('suri_pages').update({ decision: next }).eq('id', row.id),
    )
    if (error) return
    // load()는 rows만 새로 받는다 — 모달이 들고 있는 복사본까지 갱신해야
    // 버튼 라벨이 바뀌고 두 번째 클릭이 반대 방향으로 동작한다.
    setEditing((cur) => (cur && cur.id === row.id ? { ...cur, decision: next } : cur))
  }

  const remove = (row: Row) => {
    if (!confirm('이 지역 페이지를 삭제할까요? (본문 섹션·사진도 함께 삭제됩니다)')) return
    run('삭제', () => supabase.from('suri_pages').delete().eq('id', row.id))
  }

  // 키워드 블럭의 지역 칩에서 바로 지우는 경로. 지역 자체가 아니라 그 조합 페이지만 지운다.
  const detachRegion = (row: Row) => {
    if (!confirm(`'${regionLabel(row.region_id)}' 지역 페이지를 삭제할까요? (본문·사진도 함께)`))
      return
    run('지역 페이지 삭제', () => supabase.from('suri_pages').delete().eq('id', row.id))
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

  // 새 지역 페이지의 기본 메타. 붙이는 경로가 둘(체크박스·자유 입력)이라 한군데로 모은다.
  function landingPayload(kwId: number, regionId: number, label: string) {
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
    const payload = targets.map((regionId) =>
      landingPayload(kwId, regionId, `${regionLabel(regionId)} ${kw.display_name}`),
    )
    run(`${targets.length}개 지역 붙이기`, () =>
      supabase.from('suri_pages').insert(payload),
    ).then(() => {
      setPicked(new Set())
      setAttachKw(null)
    })
  }

  // 관리 화면에서 '분야'는 노출하지 않지만 스키마의 category_id는 NOT NULL이다.
  // 새 키워드는 전부 slug='general' 한 곳에 붙인다(없으면 만든다).
  // 기존 키워드의 category_id는 건드리지 않는다.
  async function generalCategoryId(): Promise<{ id?: number; error?: { message: string } }> {
    const found = await supabase.from('suri_categories').select('id').eq('slug', 'general').limit(1)
    if (found.error) return { error: found.error }
    if (found.data && found.data.length > 0) return { id: found.data[0].id as number }
    const made = await supabase
      .from('suri_categories')
      .insert({ slug: 'general', display_name: '수리', sort_order: 99 })
      .select('id')
      .single()
    if (made.error) return { error: made.error }
    return { id: made.data.id as number }
  }

  // 새 키워드를 만든다. 슬러그가 그대로 URL의 첫 구간이 되므로
  // 한글 이름을 로마자로 옮겨 쓴다 (비둘기 퇴치 → bidulgi-toechi).
  // 여러 줄을 넣으면 한 번에 여러 개를 만든다.
  const createKeywords = () => {
    if (newKwName.trim() === '') return
    const names = newKwName
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) return

    run(`키워드 ${names.length}개 추가`, async () => {
      const cat = await generalCategoryId()
      if (cat.error) return { error: cat.error }
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
          category_id: cat.id!,
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

  const openKeywordEdit = (k: Kw) => {
    setEditKw(k.id)
    setPhotoKw(null)
    setAttachKw(null)
    setKwName(k.display_name)
    setKwDesc(k.description ?? '')
    setKwSlug(k.slug)
  }

  const saveKeyword = (k: Kw) => {
    const name = kwName.trim()
    const slug = toSlug(kwSlug) || toSlug(name)
    if (!name || !slug) {
      setMsg('이름과 주소를 모두 채워주세요.')
      return
    }
    run('키워드 수정', async () => {
      // slug는 UNIQUE다. 저장 직전에 다른 키워드가 쓰고 있는지 확인해서
      // 제약 위반 메시지 대신 사람이 읽을 수 있는 안내를 준다.
      if (slug !== k.slug) {
        const { data: taken, error } = await supabase
          .from('suri_repair_keywords')
          .select('id')
          .eq('slug', slug)
          .limit(1)
        if (error) return { error }
        if (taken && taken.length > 0 && taken[0].id !== k.id)
          return { error: { message: `주소 '${slug}'는 다른 키워드가 이미 쓰고 있습니다.` } }
      }
      return supabase
        .from('suri_repair_keywords')
        .update({ display_name: name, description: kwDesc.trim() || null, slug })
        .eq('id', k.id)
    }).then(() => setEditKw(null))
  }

  const removeKeyword = async (k: Kw) => {
    const n = (rowsByKw.get(k.id) ?? []).length
    // suri_cases는 내부 전용이라 관리 화면(authenticated) 권한으로는 아예 안 읽힐 수 있다.
    // 0으로 읽혀도 '없음'인지 '못 읽음'인지 구분이 안 되므로, 개수는 읽혔을 때만 붙이고
    // 경고 문구 자체는 언제나 띄운다.
    const counted = await supabase
      .from('suri_cases')
      .select('id', { count: 'exact', head: true })
      .eq('repair_keyword_id', k.id)
    const caseLine =
      !counted.error && (counted.count ?? 0) > 0
        ? `· 시공 기록(현장 사례) ${counted.count}건`
        : '· 이 키워드에 딸린 시공 기록(현장 사례)'

    const lines = [`'${k.display_name}' 키워드를 삭제합니다.`]
    if (n > 0) lines.push(`· 지역 페이지 ${n}건 (본문·사진 포함)`)
    lines.push(caseLine)
    lines.push('', '모두 함께 삭제되며 되돌릴 수 없습니다. 계속할까요?')
    if (!confirm(lines.join('\n'))) return

    run('키워드 삭제', async () => {
      // suri_repair_keywords를 ON DELETE RESTRICT로 참조하는 테이블은 둘이다 —
      // suri_pages와 suri_cases. 하나라도 남으면 키워드 삭제가 23503으로 실패하는데
      // 그때 이미 지운 페이지는 되돌아오지 않는다. 그래서 (1) 단계마다 error를 확인해
      // 즉시 중단하고, (2) 권한이 막힐 확률이 높은 suri_cases부터 지운다 —
      // 여기서 실패하면 지역 페이지는 그대로 남는다.
      // suri_pages.source_case_id는 ON DELETE SET NULL이라 사례를 먼저 지워도 페이지는 산다.
      const cases = await supabase.from('suri_cases').delete().eq('repair_keyword_id', k.id)
      if (cases.error) return { error: cases.error }

      // RLS가 DELETE를 막으면 에러 없이 0건만 지워진다. 읽을 수 있을 때만이라도 남은 사례를
      // 확인해서, 페이지를 날린 뒤 키워드 삭제가 실패하는 최악의 상태를 막는다.
      const left = await supabase
        .from('suri_cases')
        .select('id', { count: 'exact', head: true })
        .eq('repair_keyword_id', k.id)
      if (!left.error && (left.count ?? 0) > 0)
        return {
          error: {
            message: `시공 기록 ${left.count}건이 지워지지 않아 중단했습니다. 지역 페이지는 그대로입니다. (suri_cases 삭제 권한 확인 필요)`,
          },
        }

      const pages = await supabase.from('suri_pages').delete().eq('repair_keyword_id', k.id)
      if (pages.error) return { error: pages.error }
      // 페이지 본문·사진은 페이지에, 키워드 사진 세트는 키워드에 CASCADE로 딸려 지워진다.
      return supabase.from('suri_repair_keywords').delete().eq('id', k.id)
    }).then(() => setEditKw(null))
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
        // parent_id가 NULL이면 Postgres가 유니크를 걸지 않아 같은 이름이 여러 행일 수 있다.
        // maybeSingle()은 그때 에러를 내고 data를 null로 주므로 지역을 또 만들어 버린다 —
        // limit(1)로 첫 행을 그대로 쓴다.
        const { data: existing, error: findErr } = await supabase
          .from('suri_regions')
          .select('id')
          .eq('display_name', rName)
          .limit(1)
        if (findErr) return { error: findErr }

        if (existing && existing.length > 0) {
          regionId = existing[0].id
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
              .limit(1)
            if (!taken || taken.length === 0) break
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

        const { error: pageErr } = await supabase
          .from('suri_pages')
          .insert(landingPayload(kwId, regionId, `${rName} ${kw.display_name}`))
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

  // ── 키워드 사진 세트 ──────────────────────────────────────────────

  // 사진이 아직 없는 세트는 DB 행이 없으므로 화면에만 있는 초안 번호와 합쳐서 보여준다.
  const setsOf = (kwId: number): PhotoSetView[] => {
    const saved = setsByKw.get(kwId) ?? []
    const drafts = (draftSets[kwId] ?? [])
      .filter((n) => !saved.some((s) => s.setNo === n))
      .map((n) => ({ setNo: n, before: null, after: null, process: [], caption: '' }))
    return [...saved, ...drafts].sort((a, b) => a.setNo - b.setNo)
  }

  const captionKey = (kwId: number, setNo: number) => `${kwId}-${setNo}`

  const captionOf = (kwId: number, setNo: number) => {
    const key = captionKey(kwId, setNo)
    if (key in captionDraft) return captionDraft[key]
    return (setsByKw.get(kwId) ?? []).find((s) => s.setNo === setNo)?.caption ?? ''
  }

  const openPhotoPanel = (k: Kw) => {
    setPhotoKw(k.id)
    setAttachKw(null)
    setEditKw(null)
    // 사진이 하나도 없으면 빈 세트 1을 미리 깔아 준다 — 바로 끌어다 놓을 수 있게.
    if ((setsByKw.get(k.id) ?? []).length === 0 && (draftSets[k.id] ?? []).length === 0)
      setDraftSets((prev) => ({ ...prev, [k.id]: [1] }))
  }

  const addSet = (kwId: number) => {
    const current = setsOf(kwId)
    const next = current.length ? Math.max(...current.map((s) => s.setNo)) + 1 : 1
    setDraftSets((prev) => ({ ...prev, [kwId]: [...(prev[kwId] ?? []), next] }))
  }

  // 업로드 경로는 페이지 사진(`{pageId}/...`)과 겹치지 않게 keyword/ 아래에 둔다.
  async function uploadKeywordImage(
    kwId: number,
    setNo: number,
    role: KeywordImageRole,
    file: File,
    replace: KeywordImage | null,
  ) {
    const key = `${kwId}-${setNo}-${role}-${replace?.id ?? 'new'}`
    setUploading(key)
    setMsg('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `keyword/${kwId}/${setNo}-${role}-${Date.now()}.${ext}`
    const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (up.error) {
      setUploading(null)
      setMsg(`업로드 실패: ${up.error.message}`)
      return
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const caption = captionOf(kwId, setNo).trim()
    const processCount =
      (setsByKw.get(kwId) ?? []).find((s) => s.setNo === setNo)?.process.length ?? 0
    const res = replace
      ? await supabase
          .from('suri_keyword_images')
          .update({ url: data.publicUrl })
          .eq('id', replace.id)
      : await supabase.from('suri_keyword_images').insert({
          repair_keyword_id: kwId,
          set_no: setNo,
          role,
          url: data.publicUrl,
          caption: caption || null,
          sort_order: role === 'BEFORE' ? 0 : role === 'AFTER' ? 1 : 2 + processCount,
        })
    setUploading(null)
    if (res.error) setMsg(`사진 등록 실패: ${res.error.message}`)
    else {
      setMsg('사진 등록 완료 — 사이트 반영은 Deploy 워크플로 실행 후')
      await load()
    }
  }

  const removeKeywordImage = (im: KeywordImage) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    run('사진 삭제', () => supabase.from('suri_keyword_images').delete().eq('id', im.id))
  }

  // 설명은 세트 안의 모든 행에 같은 값으로 저장한다.
  const saveCaption = (kwId: number, setNo: number) => {
    const text = captionOf(kwId, setNo).trim()
    run('세트 설명 저장', () =>
      supabase
        .from('suri_keyword_images')
        .update({ caption: text || null })
        .eq('repair_keyword_id', kwId)
        .eq('set_no', setNo),
    ).then(() =>
      setCaptionDraft((prev) => {
        const next = { ...prev }
        delete next[captionKey(kwId, setNo)]
        return next
      }),
    )
  }

  const removeSet = (kwId: number, setNo: number) => {
    const saved = (setsByKw.get(kwId) ?? []).some((s) => s.setNo === setNo)
    if (saved && !confirm(`세트 ${setNo}의 사진을 모두 삭제할까요?`)) return
    setDraftSets((prev) => ({ ...prev, [kwId]: (prev[kwId] ?? []).filter((n) => n !== setNo) }))
    if (!saved) return
    run('사진 세트 삭제', () =>
      supabase
        .from('suri_keyword_images')
        .delete()
        .eq('repair_keyword_id', kwId)
        .eq('set_no', setNo),
    )
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
        <h1 className="font-serif-kr text-2xl font-black">키워드 관리</h1>
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
        키워드 {kws.length}개 · 지역 페이지 {rows.length}건 · 지역을 붙이면 바로 저장되지만, 공개
        사이트 반영은 <b>Deploy 워크플로 실행</b>이 필요합니다.
      </p>
      {msg && (
        <p className="mt-3 rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm font-bold text-[var(--teal)]">
          {msg}
        </p>
      )}

      {/* ── 지역 프로필 ──
          지역만 붙이면 페이지는 HOLD로 남는다. 본문을 조립할 재료가 여기서 들어가야
          발행된다. 그래서 키워드 목록보다 위에 둔다 — 실제 병목이 여기다. */}
      <div className="card mt-5 p-4">
        <button
          onClick={() => setPfPanel((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-sm font-extrabold">
            지역 프로필{' '}
            <span className="font-semibold text-[var(--ink-soft)]">
              — 채움 {rgs.filter((r) => r.profile).length} / 미입력{' '}
              {rgs.filter((r) => !r.profile).length}
            </span>
          </span>
          <span aria-hidden className="text-[var(--copper)]">
            {pfPanel ? '−' : '+'}
          </span>
        </button>

        {pfPanel && (
          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="text-[13px] text-[var(--ink-soft)]">
              주거 유형·인접 지역·주거 특성·대표 동 네 가지가 있어야 그 지역의 본문이
              만들어집니다. 저장하면 조립 가능한 페이지가 자동으로 발행 상태로 바뀝니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                placeholder="지역 검색"
                value={pfQuery}
                onChange={(e) => setPfQuery(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-1.5 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={pfOnlyMissing}
                  onChange={(e) => setPfOnlyMissing(e.target.checked)}
                />
                미입력만
              </label>
            </div>

            <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto">
              {rgs
                .filter((r) => (pfOnlyMissing ? !r.profile : true))
                .filter((r) => r.display_name.includes(pfQuery.trim()))
                .slice(0, 120)
                .map((r) => (
                  <li key={r.id} className="rounded-lg border border-[var(--line)]">
                    <button
                      onClick={() => {
                        if (pfEdit === r.id) return setPfEdit(null)
                        setPfEdit(r.id)
                        setPfDraft({
                          type: r.profile?.type ?? '',
                          near: r.profile?.near ?? r.display_name,
                          note: r.profile?.note ?? '',
                          dongs: r.profile?.dongs ?? '',
                        })
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-bold">{r.display_name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          r.profile
                            ? 'bg-[var(--teal-soft)] text-[var(--teal)]'
                            : 'bg-[#f3e3d3] text-[var(--copper)]'
                        }`}
                      >
                        {r.profile ? '입력됨' : '미입력'}
                      </span>
                    </button>

                    {pfEdit === r.id && (
                      <div className="space-y-2 border-t border-[var(--line)] p-3">
                        <select
                          value={pfDraft.type}
                          onChange={(e) => setPfDraft({ ...pfDraft, type: e.target.value })}
                          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        >
                          <option value="">주거 유형 선택</option>
                          {REGION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="인접 지역 — 맨 앞은 자기 자신 (예: 안산·시흥·화성)"
                          value={pfDraft.near}
                          onChange={(e) => setPfDraft({ ...pfDraft, near: e.target.value })}
                          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        />
                        <textarea
                          rows={2}
                          placeholder="주거 특성 한 줄 — 마침표 없이 (예: 고잔·초지 구축 아파트와 원곡 다세대 밀집지가 함께 있습니다)"
                          value={pfDraft.note}
                          onChange={(e) => setPfDraft({ ...pfDraft, note: e.target.value })}
                          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="대표 동 — 가운뎃점으로 구분 (예: 고잔·초지·선부·원곡)"
                          value={pfDraft.dongs}
                          onChange={(e) => setPfDraft({ ...pfDraft, dongs: e.target.value })}
                          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        />
                        <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">
                          미리보기 · <b>{pfDraft.dongs || '대표 동'}</b> 등 전 동 출장{' '}
                          {r.display_name} ○○. {pfDraft.note || '주거 특성'}.
                        </p>
                        <button
                          onClick={() => saveProfile(r)}
                          disabled={busy}
                          className="btn-call w-full !py-2 text-sm disabled:opacity-40"
                        >
                          저장하고 발행 전환
                        </button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          placeholder="키워드·지역 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => setNewKwOpen((v) => !v)}
          className="btn-ghost shrink-0 !py-2 text-sm"
        >
          {newKwOpen ? '닫기' : '+ 키워드 만들기'}
        </button>
      </div>

      {newKwOpen && (
        <div className="card mt-3 space-y-2 p-4">
          <p className="text-sm font-bold">새 키워드 만들기</p>
          <textarea
            rows={3}
            placeholder={'키워드 (여러 개는 줄바꿈 또는 쉼표로 구분)\n예: 비둘기 퇴치, 욕조 트랩 교체'}
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
            disabled={busy || newKwName.trim() === ''}
            className="btn-call w-full !py-2 text-sm disabled:opacity-40"
          >
            만들기
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {visibleKws.map((k) => {
          const attached = rowsByKw.get(k.id) ?? []
          const sets = setsOf(k.id)
          const cover = coverOf(sets)
          const openRegion = attachKw === k.id
          const openPhoto = photoKw === k.id
          const openEdit = editKw === k.id
          return (
            <div key={k.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-[var(--danger-bg)] text-[10px] font-black text-[var(--danger-ink)]">
                    사진 없음
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold leading-snug">{k.display_name}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">/{k.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[11px] font-black text-[var(--teal)]">
                  {attached.length}
                </span>
              </div>

              {attached.length === 0 ? (
                <p className="mt-2 w-fit rounded-full bg-[var(--danger-bg)] px-2 py-0.5 text-[11px] font-black text-[var(--danger-ink)]">
                  지역 0개 · 사이트에 노출 안 됨
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {attached.map((row) => {
                    const shots = imgsByPage.get(row.id) ?? []
                    return (
                      <li
                        key={row.id}
                        className={`flex items-center rounded-full ${
                          row.decision === 'CREATE'
                            ? 'bg-[var(--teal-soft)] text-[var(--teal)]'
                            : 'bg-[var(--danger-bg)] text-[var(--danger-ink)]'
                        }`}
                      >
                        <button
                          onClick={() => setEditing({ ...row })}
                          title="눌러서 메타 수정·사진 관리"
                          className="py-1 pl-2.5 pr-1 text-[11px] font-bold"
                        >
                          {regionLabel(row.region_id)}
                          {/* 고유 사진과 '키워드에서 상속받는 중'을 구분해서 보여준다 —
                              둘 다 사이트에는 사진이 나오지만 손댈 곳이 다르다. */}
                          {shots.length > 0 ? (
                            <span className="ml-1 opacity-70" title="이 페이지에만 쓰는 사진">
                              📷{shots.length}
                            </span>
                          ) : (
                            (setsByKw.get(row.repair_keyword_id) ?? []).length > 0 && (
                              <span
                                className="ml-1 opacity-60"
                                title="이 페이지 고유 사진은 없고 키워드 사진 세트를 상속받아 씁니다"
                              >
                                ↩
                              </span>
                            )
                          )}
                        </button>
                        <button
                          onClick={() => detachRegion(row)}
                          disabled={busy}
                          title="이 지역 페이지 삭제"
                          aria-label={`${regionLabel(row.region_id)} 지역 페이지 삭제`}
                          className="py-1 pl-0.5 pr-2 text-[11px] font-black opacity-50 hover:opacity-100"
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    if (openRegion) setAttachKw(null)
                    else {
                      setAttachKw(k.id)
                      setPhotoKw(null)
                      setEditKw(null)
                    }
                    setPicked(new Set())
                    setRegionQuery('')
                  }}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  {openRegion ? '닫기' : '+ 지역 붙이기'}
                </button>
                <button
                  onClick={() => (openPhoto ? setPhotoKw(null) : openPhotoPanel(k))}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  {openPhoto ? '닫기' : `사진 세트 ${(setsByKw.get(k.id) ?? []).length}`}
                </button>
                <button
                  onClick={() => (openEdit ? setEditKw(null) : openKeywordEdit(k))}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  {openEdit ? '닫기' : '키워드 편집'}
                </button>
              </div>

              {openRegion && (
                <div className="mt-3 rounded-lg border border-[var(--line)] p-2">
                  {/* 지역이 200개를 넘어가면 스크롤만으로는 못 찾는다 — 목록 위에 검색을 둔다. */}
                  <input
                    value={regionQuery}
                    onChange={(e) => setRegionQuery(e.target.value)}
                    placeholder="지역 검색 (예: 강남, 천안)"
                    className="mb-2 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
                  />
                  <div className="max-h-52 overflow-y-auto">
                    {selectableRegions
                      .filter(
                        (r) =>
                          regionQuery.trim() === '' ||
                          regionLabel(r.id).includes(regionQuery.trim()),
                      )
                      .map((r) => {
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

              {openPhoto && (
                <div className="mt-3 space-y-3 rounded-lg border border-[var(--line)] p-3">
                  <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
                    여기 올린 사진은 <b>{k.display_name}</b>의 지역 페이지 {attached.length}건에
                    자동으로 적용됩니다. 특정 지역만 다르게 하려면 위의 지역 칩을 눌러 그 페이지에
                    사진을 따로 올리면 그쪽이 우선합니다.
                  </p>

                  {sets.map((s) => {
                    const capKey = captionKey(k.id, s.setNo)
                    const capValue = captionOf(k.id, s.setNo)
                    const hasRows = !!(s.before || s.after || s.process.length)
                    return (
                      <div key={s.setNo} className="rounded-lg border border-[var(--line)] p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black">세트 {s.setNo}</span>
                          <button
                            onClick={() => removeSet(k.id, s.setNo)}
                            disabled={busy}
                            className="rounded px-1.5 py-0.5 text-[11px] font-bold text-[var(--danger-ink)] hover:bg-[var(--danger-bg)]"
                          >
                            세트 삭제
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <PhotoDrop
                            label="시공 전"
                            image={s.before}
                            hot={dragOver === `${k.id}-${s.setNo}-BEFORE`}
                            uploading={
                              uploading === `${k.id}-${s.setNo}-BEFORE-${s.before?.id ?? 'new'}`
                            }
                            onDragState={(over) =>
                              setDragOver(over ? `${k.id}-${s.setNo}-BEFORE` : null)
                            }
                            onFile={(f) =>
                              uploadKeywordImage(k.id, s.setNo, 'BEFORE', f, s.before)
                            }
                            onRemove={() => s.before && removeKeywordImage(s.before)}
                          />
                          <PhotoDrop
                            label="시공 후"
                            image={s.after}
                            hot={dragOver === `${k.id}-${s.setNo}-AFTER`}
                            uploading={
                              uploading === `${k.id}-${s.setNo}-AFTER-${s.after?.id ?? 'new'}`
                            }
                            onDragState={(over) =>
                              setDragOver(over ? `${k.id}-${s.setNo}-AFTER` : null)
                            }
                            onFile={(f) => uploadKeywordImage(k.id, s.setNo, 'AFTER', f, s.after)}
                            onRemove={() => s.after && removeKeywordImage(s.after)}
                          />
                        </div>

                        {s.process.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {s.process.map((p) => (
                              <PhotoDrop
                                key={p.id}
                                label="과정"
                                image={p}
                                hot={dragOver === `${k.id}-${s.setNo}-P${p.id}`}
                                uploading={uploading === `${k.id}-${s.setNo}-PROCESS-${p.id}`}
                                onDragState={(over) =>
                                  setDragOver(over ? `${k.id}-${s.setNo}-P${p.id}` : null)
                                }
                                onFile={(f) =>
                                  uploadKeywordImage(k.id, s.setNo, 'PROCESS', f, p)
                                }
                                onRemove={() => removeKeywordImage(p)}
                              />
                            ))}
                          </div>
                        )}

                        <label className="mt-2 block cursor-pointer rounded border border-dashed border-[var(--line)] py-1.5 text-center text-[11px] font-bold text-[var(--ink-soft)] hover:bg-[var(--teal-soft)]">
                          {uploading === `${k.id}-${s.setNo}-PROCESS-new`
                            ? '올리는 중…'
                            : '+ 과정 사진 추가 (선택)'}
                          <input
                            type="file"
                            accept={ACCEPT_IMAGE}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              e.target.value = ''
                              if (f) uploadKeywordImage(k.id, s.setNo, 'PROCESS', f, null)
                            }}
                          />
                        </label>

                        <div className="mt-2 flex gap-1.5">
                          <input
                            value={capValue}
                            onChange={(e) =>
                              setCaptionDraft((prev) => ({ ...prev, [capKey]: e.target.value }))
                            }
                            placeholder="세트 설명 (예: 현관문 하부 처짐 보정)"
                            className="flex-1 rounded border border-[var(--line)] px-2 py-1.5 text-xs"
                          />
                          <button
                            onClick={() => saveCaption(k.id, s.setNo)}
                            disabled={busy || !hasRows || capValue === s.caption}
                            title={hasRows ? '' : '사진을 먼저 올리면 설명이 함께 저장됩니다'}
                            className="btn-ghost shrink-0 !py-1.5 text-[11px] disabled:opacity-40"
                          >
                            설명 저장
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={() => addSet(k.id)}
                    className="btn-ghost w-full !py-1.5 text-xs"
                  >
                    + 세트 추가
                  </button>
                </div>
              )}

              {openEdit && (
                <div className="mt-3 space-y-2 rounded-lg border border-[var(--line)] p-3">
                  <label className="block text-xs font-bold">
                    이름
                    <input
                      value={kwName}
                      onChange={(e) => setKwName(e.target.value)}
                      className="mt-1 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    한 줄 설명
                    <input
                      value={kwDesc}
                      onChange={(e) => setKwDesc(e.target.value)}
                      placeholder="키워드 페이지 상단에 나옵니다 (선택)"
                      className="mt-1 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    주소(slug)
                    <input
                      value={kwSlug}
                      onChange={(e) => setKwSlug(e.target.value)}
                      className="mt-1 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    저장되는 주소: <code>/{toSlug(kwSlug) || toSlug(kwName) || 'keyword'}</code>
                  </p>
                  {attached.length > 0 && (
                    <p className="rounded-lg bg-[var(--danger-bg)] px-2 py-1.5 text-[11px] font-bold leading-relaxed text-[var(--danger-ink)]">
                      ⚠ 주소를 바꾸면 이 키워드의 지역 페이지 {attached.length}건 주소가 통째로
                      바뀝니다. 검색엔진에 쌓인 기존 색인이 끊겨 유입이 사라질 수 있으니 이름만
                      바꾸고 주소는 그대로 두는 편이 안전합니다.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveKeyword(k)}
                      disabled={busy}
                      className="btn-call flex-1 !py-1.5 text-xs disabled:opacity-40"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => removeKeyword(k)}
                      disabled={busy}
                      className="rounded-md px-2 py-1 text-xs font-bold text-[var(--danger-ink)] hover:bg-[var(--danger-bg)]"
                    >
                      키워드 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 지역 페이지 상세 — 메타 수정 + 그 페이지에만 쓰는 사진 관리 */}
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
              <p className="text-sm font-bold">이 페이지에만 쓰는 사진</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                비워 두면 키워드 사진 세트가 그대로 쓰입니다. 여기에 올리면 이 지역 페이지에서만
                키워드 사진을 대신합니다. 순서대로 2장까지 노출됩니다.
              </p>

              {/* 고유 사진이 없으면 '지금 이 페이지에 실제로 나가는 사진'은 키워드에서 상속받은 것이다.
                  관리 화면에서 그게 뭔지 못 보면 운영자가 빈 페이지로 오해한다. */}
              {(imgsByPage.get(editing.id) ?? []).length === 0 &&
                (setsByKw.get(editing.repair_keyword_id) ?? []).length > 0 && (
                  <div className="mt-2 rounded-lg border border-dashed border-[var(--line)] p-2.5">
                    <p className="text-xs font-bold text-[var(--teal)]">
                      키워드 사진 상속 중 · 세트{' '}
                      {(setsByKw.get(editing.repair_keyword_id) ?? []).length}개
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-3">
                      {(setsByKw.get(editing.repair_keyword_id) ?? []).map((s) => (
                        <li key={s.setNo}>
                          <div className="flex gap-1">
                            {[
                              { im: s.before, label: '시공 전' },
                              { im: s.after, label: '시공 후' },
                            ].map(({ im, label }) =>
                              im ? (
                                <figure key={label} className="m-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={im.url}
                                    alt=""
                                    className="h-12 w-16 rounded object-cover"
                                    loading="lazy"
                                  />
                                  <figcaption className="mt-0.5 text-center text-[10px] text-[var(--ink-soft)]">
                                    {label}
                                  </figcaption>
                                </figure>
                              ) : null,
                            )}
                          </div>
                          {s.caption && (
                            <p className="mt-0.5 max-w-[9rem] truncate text-[10px] text-[var(--ink-soft)]">
                              {s.caption}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {(imgsByPage.get(editing.id) ?? []).length === 0 &&
                (setsByKw.get(editing.repair_keyword_id) ?? []).length === 0 && (
                  <p className="mt-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-soft)]">
                    이 키워드에 등록된 사진 세트가 없어 지금은 참고 이미지가 나갑니다. 키워드 블럭의
                    “사진 세트”에서 한 번 올리면 이 페이지를 포함한 그 키워드의 모든 지역 페이지에
                    함께 적용됩니다.
                  </p>
                )}

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
                      accept={ACCEPT_IMAGE}
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
                  title={
                    editing.decision === 'CREATE'
                      ? '숨기면 목록에서 사라질 수 있습니다 — 되돌리려면 창을 닫기 전에 다시 누르세요'
                      : '다시 발행 상태로 되돌립니다'
                  }
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
              {/* 공개 조회 정책(decision <> 'HOLD')이 HOLD 행을 걸러내므로, 숨긴 페이지는
                  관리 목록에서도 사라질 수 있다. 코드로는 못 고치고 RLS 정책을 나눠야 한다. */}
              <p className="w-full text-[11px] leading-relaxed text-[var(--ink-soft)]">
                ⚠ 숨기면 이 페이지가 관리 목록에서도 사라질 수 있습니다(조회 정책이 숨김 상태를
                걸러냅니다). 되돌리려면 <b>이 창을 닫기 전에</b> 발행을 다시 누르세요 — 닫은
                뒤에는 DB 정책 변경이 필요할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// 클릭으로도, 드래그앤드롭으로도 사진을 받는 자리.
// label로 감싸서 어디를 눌러도 파일 선택이 열리게 하고, 안쪽 삭제 버튼은
// preventDefault로 label의 기본 동작(파일 선택 열기)만 막는다.
function PhotoDrop(props: {
  label: string
  image: KeywordImage | null
  hot: boolean
  uploading: boolean
  onFile: (file: File) => void
  onDragState: (over: boolean) => void
  onRemove: () => void
}) {
  const { label, image, hot, uploading, onFile, onDragState, onRemove } = props
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        onDragState(true)
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault()
        onDragState(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
      className={`relative flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center text-[11px] font-bold ${
        hot ? 'border-[var(--teal)] bg-[var(--teal-soft)]' : 'border-[var(--line)]'
      }`}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {label}
          </span>
          <span className="absolute inset-x-1 bottom-1 flex gap-1">
            <span className="flex-1 rounded bg-black/60 py-1 text-[10px] text-white">교체</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onRemove()
              }}
              className="rounded bg-[var(--danger-ink)] px-2 py-1 text-[10px] text-white"
            >
              삭제
            </button>
          </span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <span className="mt-0.5 font-normal text-[var(--ink-soft)]">클릭 또는 드래그</span>
        </>
      )}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/85 text-[11px] font-black text-[var(--teal)]">
          올리는 중…
        </span>
      )}
      <input
        type="file"
        accept={ACCEPT_IMAGE}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </label>
  )
}
