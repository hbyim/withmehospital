// 로또 6/45 번호를 대량으로 뽑아, 가장 많이 나온 조합 상위 5개를 출력한다.
// 사용법: node scripts/lotto-predict.mjs [--draws=100000000] [--top=5] [--seed=12345]

const NUMBERS = 45
const PICK = 6
const TOTAL_COMBINATIONS = 8_145_060 // C(45, 6)

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)

const draws = Number(args.get('draws') ?? 100_000_000)
const top = Number(args.get('top') ?? 5)
const seed = args.has('seed') ? Number(args.get('seed')) : null

// mulberry32: --seed 를 주면 실행마다 같은 결과를 재현할 수 있다.
function seededRandom(initial) {
  let state = initial >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = seed === null ? Math.random : seededRandom(seed)

// binomial[n * (PICK + 1) + k] = C(n, k)
const binomial = new Int32Array((NUMBERS + 1) * (PICK + 1))
for (let n = 0; n <= NUMBERS; n += 1) {
  binomial[n * (PICK + 1)] = 1
  for (let k = 1; k <= Math.min(n, PICK); k += 1) {
    const prev = (n - 1) * (PICK + 1)
    binomial[n * (PICK + 1) + k] = binomial[prev + k - 1] + binomial[prev + k]
  }
}

// 정렬된 조합 -> 0 ~ TOTAL_COMBINATIONS-1 사이의 고유 번호 (colex ranking)
function rankOf(sorted) {
  let rank = 0
  for (let k = 0; k < PICK; k += 1) {
    rank += binomial[(sorted[k] - 1) * (PICK + 1) + (k + 1)]
  }
  return rank
}

function combinationOf(rank) {
  const result = new Array(PICK)
  let remainder = rank
  for (let k = PICK; k >= 1; k -= 1) {
    let n = k - 1
    while (binomial[(n + 1) * (PICK + 1) + k] <= remainder) n += 1
    result[k - 1] = n + 1
    remainder -= binomial[n * (PICK + 1) + k]
  }
  return result
}

const counts = new Int32Array(TOTAL_COMBINATIONS)
const deck = new Uint8Array(NUMBERS)
for (let i = 0; i < NUMBERS; i += 1) deck[i] = i + 1
const swapped = new Uint8Array(PICK)
const pick = new Uint8Array(PICK)

const startedAt = Date.now()
console.log(
  `시뮬레이션 시작: ${draws.toLocaleString('ko-KR')}회 추첨 (조합 공간 ${TOTAL_COMBINATIONS.toLocaleString('ko-KR')}개)`,
)

for (let drawIndex = 0; drawIndex < draws; drawIndex += 1) {
  // 부분 Fisher-Yates: 앞 6칸만 섞어서 중복 없는 6개를 뽑는다.
  for (let i = 0; i < PICK; i += 1) {
    const j = i + ((random() * (NUMBERS - i)) | 0)
    swapped[i] = j
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }

  // 삽입 정렬 (6개라 이게 가장 빠르다)
  for (let i = 0; i < PICK; i += 1) {
    const value = deck[i]
    let j = i - 1
    while (j >= 0 && pick[j] > value) {
      pick[j + 1] = pick[j]
      j -= 1
    }
    pick[j + 1] = value
  }

  counts[rankOf(pick)] += 1

  // deck 을 원래 상태로 되돌린다 (매번 새로 만들지 않기 위해)
  for (let i = PICK - 1; i >= 0; i -= 1) {
    const j = swapped[i]
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }

  if ((drawIndex + 1) % 10_000_000 === 0) {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`  ${(drawIndex + 1).toLocaleString('ko-KR')}회 완료 (${seconds}초)`)
  }
}

// 상위 N개만 추린다 (8백만 개를 전부 정렬할 필요는 없다)
const leaders = []
for (let rank = 0; rank < TOTAL_COMBINATIONS; rank += 1) {
  const count = counts[rank]
  if (leaders.length === top && count <= leaders[top - 1].count) continue

  const entry = { rank, count }
  let i = leaders.length - 1
  leaders.push(entry)
  while (i >= 0 && leaders[i].count < count) {
    leaders[i + 1] = leaders[i]
    leaders[i] = entry
    i -= 1
  }
  if (leaders.length > top) leaders.pop()
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
const expected = draws / TOTAL_COMBINATIONS

console.log(`\n=== 최다 출현 조합 상위 ${top}개 (${draws.toLocaleString('ko-KR')}회 중) ===`)
for (const [index, { rank, count }] of leaders.entries()) {
  const numbers = combinationOf(rank)
    .map((n) => String(n).padStart(2, '0'))
    .join(' ')
  console.log(`${index + 1}등  ${numbers}   ${count}회`)
}

console.log(`\n소요 시간 ${elapsed}초 / 조합당 평균 출현 ${expected.toFixed(2)}회`)
console.log('참고: 각 조합의 확률은 모두 동일하므로 위 순위는 무작위 편차일 뿐 예측력이 없다.')
