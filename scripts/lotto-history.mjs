// 로또 6/45 역대 당첨번호를 동행복권에서 받아 캐시하고 검증한다.
// 사용법: node scripts/lotto-history.mjs [--refresh]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cachePath = join(root, '.cache/lotto-draws.json')

const DH_URL = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all'
const MIRROR_URL = 'https://smok95.github.io/lotto/results/all.json'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

async function fetchOfficial() {
  const res = await fetch(`${DH_URL}&_=${Date.now()}`, {
    headers: {
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://dhlottery.co.kr/lt645/result',
    },
  })
  if (!res.ok) throw new Error(`동행복권 응답 ${res.status}`)
  const body = await res.json()
  const list = body?.data?.list
  if (!Array.isArray(list) || list.length === 0) throw new Error('동행복권 응답에 list 없음')

  return list.map((row) => ({
    no: Number(row.ltEpsd),
    date: String(row.ltRflYmd),
    nums: [row.tm1WnNo, row.tm2WnNo, row.tm3WnNo, row.tm4WnNo, row.tm5WnNo, row.tm6WnNo]
      .map(Number)
      .sort((a, b) => a - b),
    bonus: Number(row.bnsWnNo),
  }))
}

async function fetchMirror() {
  const res = await fetch(MIRROR_URL)
  if (!res.ok) throw new Error(`미러 응답 ${res.status}`)
  const body = await res.json()
  return body.map((row) => ({
    no: Number(row.draw_no),
    nums: [...row.numbers].map(Number).sort((a, b) => a - b),
    bonus: Number(row.bonus_no),
  }))
}

// 회차 연속성 / 번호 범위 / 중복 여부를 확인한다. 문제가 있으면 던진다.
function assertValid(draws) {
  if (draws.length === 0) throw new Error('회차가 비어 있음')
  for (const [index, draw] of draws.entries()) {
    if (draw.no !== index + 1) throw new Error(`회차 연속성 오류: ${index + 1}번째가 ${draw.no}회`)
    const unique = new Set(draw.nums)
    if (unique.size !== 6) throw new Error(`${draw.no}회 번호 중복`)
    if (draw.nums.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) {
      throw new Error(`${draw.no}회 번호 범위 오류`)
    }
    if (draw.bonus < 1 || draw.bonus > 45 || unique.has(draw.bonus)) {
      throw new Error(`${draw.no}회 보너스 번호 오류`)
    }
  }
}

// 미러와 대조해 한 회차라도 다르면 던진다. 네트워크 실패 시엔 조용히 건너뛴다.
async function crossCheck(draws) {
  let mirror
  try {
    mirror = await fetchMirror()
  } catch {
    return { compared: 0, skipped: true }
  }

  const byNo = new Map(mirror.map((row) => [row.no, row]))
  let compared = 0
  for (const draw of draws) {
    const other = byNo.get(draw.no)
    if (!other) continue
    compared += 1
    if (other.nums.join() !== draw.nums.join() || other.bonus !== draw.bonus) {
      throw new Error(`${draw.no}회 교차검증 불일치: ${draw.nums.join(',')} vs ${other.nums.join(',')}`)
    }
  }
  return { compared, skipped: false }
}

export async function loadDraws({ refresh = false, verbose = false } = {}) {
  if (!refresh && existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'))
    assertValid(cached)
    if (verbose) console.log(`캐시 사용: 1~${cached.length}회`)
    return cached
  }

  const draws = (await fetchOfficial()).sort((a, b) => a.no - b.no)
  assertValid(draws)
  const { compared, skipped } = await crossCheck(draws)

  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, JSON.stringify(draws))

  if (verbose) {
    const latest = draws.at(-1)
    console.log(`동행복권에서 1~${latest.no}회 수집 (최근 추첨일 ${latest.date})`)
    console.log(skipped ? '교차검증 건너뜀 (미러 접속 실패)' : `교차검증 통과: ${compared}회차 일치`)
  }
  return draws
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const draws = await loadDraws({ refresh: process.argv.includes('--refresh'), verbose: true })
  for (const draw of draws.slice(-5)) {
    console.log(`  ${draw.no}회 ${draw.date ?? ''} ${draw.nums.join(' ')} + ${draw.bonus}`)
  }
}
