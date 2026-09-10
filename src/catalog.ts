/** skill-admin catalog adapter (mock now, swap URL later) */

export interface CatalogPerson {
  id: string
  name: string
  gender: 'male' | 'female'
  dept?: string
}

export interface CatalogAgent {
  id: string
  name: string
  skill: string
  avatar?: 'robot'
}

const MOCK_PEOPLE: CatalogPerson[] = [
  { id: 'p_zhang', name: '张三', gender: 'male', dept: '财务部' },
  { id: 'p_li', name: '李四', gender: 'female', dept: '财务部' },
  { id: 'p_wang', name: '王五', gender: 'male', dept: '财务部' },
  { id: 'p_zhao', name: '赵六', gender: 'female', dept: '财务部' },
  { id: 'p_qian', name: '钱七', gender: 'male', dept: '财务部' },
  { id: 'p_sun', name: '孙八', gender: 'female', dept: '业务部' },
]

const MOCK_AGENTS: CatalogAgent[] = [
  { id: 'agent_mail_1', name: '邮件助手-1', skill: 'mail', avatar: 'robot' },
  { id: 'agent_mail_2', name: '邮件助手-2', skill: 'mail', avatar: 'robot' },
  { id: 'agent_mail_3', name: '邮件助手-3', skill: 'mail', avatar: 'robot' },
]

export interface SkillAdminConfig {
  /** e.g. http://192.168.x.x:port */
  baseUrl: string
}

const CFG_KEY = 'monday.skillAdmin'

export function getSkillAdminConfig(): SkillAdminConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) return JSON.parse(raw) as SkillAdminConfig
  } catch {
    /* ignore */
  }
  return { baseUrl: '' }
}

export function setSkillAdminConfig(cfg: SkillAdminConfig): void {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
}

/** Load people from skill-admin; falls back to mock when unreachable */
export async function fetchPeople(): Promise<CatalogPerson[]> {
  const { baseUrl } = getSkillAdminConfig()
  if (!baseUrl) return MOCK_PEOPLE
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/users`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as CatalogPerson[]
    return Array.isArray(data) && data.length ? data : MOCK_PEOPLE
  } catch {
    return MOCK_PEOPLE
  }
}

/** Load agents/skills from skill-admin */
export async function fetchAgents(): Promise<CatalogAgent[]> {
  const { baseUrl } = getSkillAdminConfig()
  if (!baseUrl) return MOCK_AGENTS
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/agents`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as CatalogAgent[]
    return Array.isArray(data) && data.length ? data : MOCK_AGENTS
  } catch {
    return MOCK_AGENTS
  }
}
