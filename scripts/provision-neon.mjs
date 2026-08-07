#!/usr/bin/env node
/**
 * Neon 프로젝트/DB를 만들고 DATABASE_URL 을 출력합니다.
 *
 * 사전 준비:
 *   1) https://console.neon.tech 가입
 *   2) Account Settings → API Keys → Create
 *   3) export NEON_API_KEY=...
 *
 * 실행:
 *   node scripts/provision-neon.mjs
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const API = 'https://console.neon.tech/api/v2'
const key = process.env.NEON_API_KEY

if (!key) {
  console.error(`
NEON_API_KEY 가 없습니다.

1. https://console.neon.tech 가입/로그인
2. Account Settings → API Keys → Create new API key
3. 터미널에서:
   export NEON_API_KEY='napi_...'
   node scripts/provision-neon.mjs
`)
  process.exit(1)
}

async function neon(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`)
  }
  return data
}

const projectName = process.env.NEON_PROJECT_NAME || 'mosimi'
const region = process.env.NEON_REGION || 'aws-ap-southeast-1' // Singapore (Render singapore와 근접)

console.log(`Creating Neon project "${projectName}" in ${region}...`)

const created = await neon('/projects', {
  method: 'POST',
  body: JSON.stringify({
    project: {
      name: projectName,
      region_id: region,
      pg_version: 16,
    },
  }),
})

const project = created.project
const connectionUri =
  created.connection_uris?.[0]?.connection_uri ||
  created.connection_uri ||
  null

let databaseUrl = connectionUri

if (!databaseUrl) {
  // fallback: list connection uri
  const detail = await neon(`/projects/${project.id}/connection_uri?database_name=neondb&role_name=neondb_owner`)
  databaseUrl = detail.uri || detail.connection_uri
}

if (!databaseUrl) {
  console.error('Project created but connection URI missing. Check Neon console.')
  console.log(JSON.stringify(created, null, 2))
  process.exit(1)
}

const out = resolve(process.cwd(), 'apps/api/.env.neon')
writeFileSync(
  out,
  `DATABASE_URL=${databaseUrl}\n`,
  { encoding: 'utf8' },
)

console.log(`
✅ Neon project ready
  id:   ${project.id}
  name: ${project.name}
  uri:  ${databaseUrl.replace(/:[^:@/]+@/, ':***@')}

Saved to apps/api/.env.neon (gitignored pattern *.local / use carefully)

Next:
  1) Render Dashboard → New → Blueprint → this repo (render.yaml)
  2) Set DATABASE_URL to the URI above
  3) After deploy, set GitHub secret VITE_API_BASE_URL=https://<your-service>.onrender.com
  4) Re-run Pages workflow
`)
