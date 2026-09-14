// 1회~최근 회차의 패턴 통계로 조합을 채점하고, 1억 개 후보 중 점수 상위 5개를 출력한다.
//
// 채점 방식: 11가지 패턴 특성마다 log((역대 관측 횟수 + k) / (조합론적 기대 횟수 + k))를 가중치로 쓴다.
// 역사적으로 기대보다 자주 나온 패턴이면 +, 덜 나온 패턴이면 -가 되고, 그 합이 조합의 점수다.
// k는 축소(shrinkage) 상수로, 기대 횟수가 작아 통계적으로 못 믿을 구간의 가중치를 0으로 눌러준다.
// (k가 없으면 1,240회 표본에서 기대 0.03회인 구간이 한 번 나온 것만으로 가중치가 폭발한다.)
//
// 사용법: node scripts/lotto-pattern-predict.mjs [--draws=100000000] [--top=5] [--kappa=20]
//         node scripts/lotto-pattern-predict.mjs --exhaustive   # 전체 8,145,060개 완전탐색
//         node scripts/lotto-pattern-predict.mjs --backtest     # 백분위 기반 예측력 검증
//         node scripts/lotto-pattern-predict.mjs --check=30     # 최근 30회차에 실제로 걸었다면 몇 등이었는지

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDraws } from './lotto-history.mjs'

const NUMBERS = 45
const PICK = 6
const TOTAL_COMBINATIONS = 8_145_060

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, '.cache/lotto-baseline.json')

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)
const argNum = (key, fallback) => (args.has(key) ? Number(args.get(key)) : fallback)

const drawCount = argNum('draws', 100_000_000)
const topCount = argNum('top', 5)
const kappa = argNum('kappa', 20)

// ---------------------------------------------------------------- 조합 인코딩

// binomial[n * (PICK + 1) + k] = C(n, k)
const binomial = new Int32Array((NUMBERS + 1) * (PICK + 1))
for (let n = 0; n <= NUMBERS; n += 1) {
  binomial[n * (PICK + 1)] = 1
  for (let k = 1; k <= Math.min(n, PICK); k += 1) {
    const prev = (n - 1) * (PICK + 1)
    binomial[n * (PICK + 1) + k] = binomial[prev + k - 1] + binomial[prev + k]
  }
}

function rankOf(sorted) {
  let rank = 0
  for (let k = 0; k < PICK; k += 1) rank += binomial[(sorted[k] - 1) * (PICK + 1) + (k + 1)]
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

// 6중 루프로 8,145,060개 조합을 정렬된 순서대로 방문한다.
function forEachCombination(visit) {
  const combo = new Uint8Array(PICK)
  for (let a = 1; a <= 40; a += 1) {
    combo[0] = a
    for (let b = a + 1; b <= 41; b += 1) {
      combo[1] = b
      for (let c = b + 1; c <= 42; c += 1) {
        combo[2] = c
        for (let d = c + 1; d <= 43; d += 1) {
          combo[3] = d
          for (let e = d + 1; e <= 44; e += 1) {
            combo[4] = e
            for (let f = e + 1; f <= 45; f += 1) {
              combo[5] = f
              visit(combo)
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- 패턴 특성

const SECTION_OF = new Uint8Array(NUMBERS + 1)
for (let n = 1; n <= NUMBERS; n += 1) SECTION_OF[n] = Math.min(4, Math.floor(n / 10))

const popcount = (v) => {
  let x = v - ((v >> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x = (x + (x >> 4)) & 0x0f0f0f0f
  return (x * 0x01010101) >> 24
}

// 조합 단위 특성 8종. 각 특성의 구간 수(bins)와 추출 함수를 정의한다.
const FEATURES = [
  {
    key: 'sum',
    label: '번호 합계(10 단위)',
    bins: 26,
    of: (c) => ((c[0] + c[1] + c[2] + c[3] + c[4] + c[5]) / 10) | 0,
  },
  {
    key: 'odd',
    label: '홀수 개수',
    bins: 7,
    of: (c) => (c[0] & 1) + (c[1] & 1) + (c[2] & 1) + (c[3] & 1) + (c[4] & 1) + (c[5] & 1),
  },
  {
    key: 'low',
    label: '저번호(1~22) 개수',
    bins: 7,
    of: (c) => (c[0] < 23) + (c[1] < 23) + (c[2] < 23) + (c[3] < 23) + (c[4] < 23) + (c[5] < 23),
  },
  {
    key: 'consecutive',
    label: '연속번호 쌍 개수',
    bins: 6,
    of: (c) => {
      let n = 0
      for (let i = 1; i < PICK; i += 1) if (c[i] === c[i - 1] + 1) n += 1
      return n
    },
  },
  {
    key: 'lastDigitSum',
    label: '끝수 합(5 단위)',
    bins: 11,
    of: (c) => (((c[0] % 10) + (c[1] % 10) + (c[2] % 10) + (c[3] % 10) + (c[4] % 10) + (c[5] % 10)) / 5) | 0,
  },
  {
    key: 'lastDigitDup',
    label: '끝수 중복 개수',
    bins: 7,
    of: (c) => {
      let mask = 0
      for (let i = 0; i < PICK; i += 1) mask |= 1 << c[i] % 10
      return PICK - popcount(mask)
    },
  },
  {
    key: 'section',
    label: '구간 분포(1~9/10~19/20~29/30~39/40~45)',
    bins: 7 ** 5,
    of: (c) => {
      const s = [0, 0, 0, 0, 0]
      for (let i = 0; i < PICK; i += 1) s[SECTION_OF[c[i]]] += 1
      return s[0] + 7 * s[1] + 49 * s[2] + 343 * s[3] + 2401 * s[4]
    },
  },
  {
    key: 'ac',
    label: 'AC값(번호 간 차이의 다양성)',
    bins: 11,
    of: (c) => {
      let lo = 0
      let hi = 0
      for (let i = 0; i < PICK - 1; i += 1) {
        for (let j = i + 1; j < PICK; j += 1) {
          const diff = c[j] - c[i]
          if (diff < 32) lo |= 1 << diff
          else hi |= 1 << (diff - 32)
        }
      }
      return popcount(lo) + popcount(hi) - (PICK - 1)
    },
  },
]

function choose(n, k) {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i += 1) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 직전 회차와 겹치는 번호 개수는 초기하분포로 이론값이 나온다.
const OVERLAP_BASE = Float64Array.from({ length: PICK + 1 }, (_, k) => (choose(PICK, k) * choose(NUMBERS - PICK, PICK - k)) / TOTAL_COMBINATIONS)

// 미출현 기간(이월수) 버킷. 독립 추첨이라면 성공확률 6/45의 기하분포를 따른다.
const GAP_BUCKETS = [1, 2, 3, 4, 5, 8, 12, 20, Infinity]
const gapBucketOf = (gap) => GAP_BUCKETS.findIndex((upper) => gap <= upper)
const GAP_BASE = new Float64Array(GAP_BUCKETS.length)
{
  const p = PICK / NUMBERS
  for (let gap = 1; gap <= 400; gap += 1) GAP_BASE[gapBucketOf(gap)] += p * (1 - p) ** (gap - 1)
  const leftover = 1 - GAP_BASE.reduce((s, v) => s + v, 0)
  GAP_BASE[GAP_BUCKETS.length - 1] += Math.max(0, leftover)
}

// ------------------------------------------------- 이론 분포(완전탐색, 캐시)

function computeBaseline() {
  if (existsSync(baselinePath)) {
    const cached = JSON.parse(readFileSync(baselinePath, 'utf8'))
    if (cached.version === 2) return cached.dist.map((d) => Float64Array.from(d))
  }

  const counts = FEATURES.map((feature) => new Float64Array(feature.bins))
  forEachCombination((combo) => {
    for (let i = 0; i < FEATURES.length; i += 1) counts[i][FEATURES[i].of(combo)] += 1
  })
  const dist = counts.map((c) => c.map((v) => v / TOTAL_COMBINATIONS))

  mkdirSync(dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, JSON.stringify({ version: 2, dist: dist.map((d) => [...d]) }))
  return dist
}

// ---------------------------------------------------------------- 모델 학습

// draws(1회~t회)의 패턴 통계로 가중치 테이블을 만든다.
function buildModel(draws, baseline) {
  const n = draws.length

  const numberCount = new Float64Array(NUMBERS + 1)
  const pairCount = new Float64Array((NUMBERS + 1) * (NUMBERS + 1))
  const gapCount = new Float64Array(GAP_BUCKETS.length)
  const overlapCount = new Float64Array(PICK + 1)
  const featureCount = FEATURES.map((feature) => new Float64Array(feature.bins))
  const lastSeen = new Int32Array(NUMBERS + 1) // 0 = 아직 안 나옴

  for (const [index, draw] of draws.entries()) {
    const combo = draw.nums
    for (let i = 0; i < PICK; i += 1) {
      const a = combo[i]
      numberCount[a] += 1
      for (let j = i + 1; j < PICK; j += 1) pairCount[a * (NUMBERS + 1) + combo[j]] += 1
      if (lastSeen[a] > 0) gapCount[gapBucketOf(index + 1 - lastSeen[a])] += 1
    }
    for (let i = 0; i < FEATURES.length; i += 1) featureCount[i][FEATURES[i].of(combo)] += 1
    if (index > 0) {
      const prev = new Set(draws[index - 1].nums)
      overlapCount[combo.filter((x) => prev.has(x)).length] += 1
    }
    for (const a of combo) lastSeen[a] = index + 1
  }

  // 관측 횟수와 기대 횟수의 로그비. k 덕분에 기대 횟수가 작은 구간은 자동으로 0에 가까워진다.
  const weight = (count, expected) => Math.log((count + kappa) / (expected + kappa))

  const numberWeight = new Float64Array(NUMBERS + 1)
  for (let a = 1; a <= NUMBERS; a += 1) {
    numberWeight[a] = weight(numberCount[a], (n * PICK) / NUMBERS)
  }

  const pairWeight = new Float64Array((NUMBERS + 1) * (NUMBERS + 1))
  const pairExpected = (n * PICK * (PICK - 1)) / (NUMBERS * (NUMBERS - 1))
  for (let a = 1; a <= NUMBERS; a += 1) {
    for (let b = a + 1; b <= NUMBERS; b += 1) {
      pairWeight[a * (NUMBERS + 1) + b] = weight(pairCount[a * (NUMBERS + 1) + b], pairExpected)
    }
  }

  // 미출현 기간은 채점 시점에 번호별로 확정되므로, 번호당 하나의 값으로 접어둔다.
  const gapTotal = gapCount.reduce((s, v) => s + v, 0)
  const gapWeightByBucket = Float64Array.from(GAP_BASE, (base, i) => weight(gapCount[i], gapTotal * base))
  const gapWeight = new Float64Array(NUMBERS + 1)
  for (let a = 1; a <= NUMBERS; a += 1) {
    gapWeight[a] = lastSeen[a] > 0 ? gapWeightByBucket[gapBucketOf(n + 1 - lastSeen[a])] : 0
  }

  const overlapTotal = overlapCount.reduce((s, v) => s + v, 0)
  const overlapWeight = Float64Array.from(OVERLAP_BASE, (base, k) => weight(overlapCount[k], overlapTotal * base))

  const featureWeight = baseline.map((dist, i) =>
    Float64Array.from(dist, (base, bin) => weight(featureCount[i][bin], n * base)),
  )

  // 직전 회차 번호를 비트마스크로 (겹침 개수 계산용)
  const prevMask = new Uint8Array(NUMBERS + 1)
  for (const a of draws.at(-1).nums) prevMask[a] = 1

  return { numberWeight, pairWeight, gapWeight, overlapWeight, featureWeight, prevMask, trained: n }
}

function makeScorer(model) {
  const { numberWeight, pairWeight, gapWeight, overlapWeight, featureWeight, prevMask } = model
  const featureOf = FEATURES.map((f) => f.of)

  return function score(combo) {
    let total = 0
    let overlap = 0
    for (let i = 0; i < PICK; i += 1) {
      const a = combo[i]
      total += numberWeight[a] + gapWeight[a]
      overlap += prevMask[a]
      for (let j = i + 1; j < PICK; j += 1) total += pairWeight[a * (NUMBERS + 1) + combo[j]]
    }
    total += overlapWeight[overlap]
    for (let i = 0; i < featureOf.length; i += 1) total += featureWeight[i][featureOf[i](combo)]
    return total
  }
}

// 어떤 특성이 점수를 밀어올렸는지 분해해서 보여준다.
function explain(model, combo) {
  const { numberWeight, pairWeight, gapWeight, overlapWeight, featureWeight, prevMask } = model
  const rows = []

  let numberSum = 0
  let gapSum = 0
  let pairSum = 0
  let overlap = 0
  for (let i = 0; i < PICK; i += 1) {
    numberSum += numberWeight[combo[i]]
    gapSum += gapWeight[combo[i]]
    overlap += prevMask[combo[i]]
    for (let j = i + 1; j < PICK; j += 1) pairSum += pairWeight[combo[i] * (NUMBERS + 1) + combo[j]]
  }
  rows.push(['번호별 역대 출현빈도', numberSum, ''])
  rows.push(['번호쌍 동시출현(15쌍)', pairSum, ''])
  rows.push(['미출현 기간(이월수)', gapSum, ''])
  rows.push(['직전 회차와 겹침', overlapWeight[overlap], `${overlap}개`])
  for (let i = 0; i < FEATURES.length; i += 1) {
    const bin = FEATURES[i].of(combo)
    rows.push([FEATURES[i].label, featureWeight[i][bin], `구간 ${bin}`])
  }

  console.log('\n1위 조합의 특성별 기여도 (양수 = 역대에 기대보다 자주 나온 패턴)')
  for (const [label, value, note] of rows.sort((a, b) => b[1] - a[1])) {
    const sign = value >= 0 ? '+' : '-'
    console.log(`  ${sign}${Math.abs(value).toFixed(4).padStart(7)}  ${label}${note ? ` (${note})` : ''}`)
  }
}

// ---------------------------------------------------------------- 상위 K 추적

function makeTopK(k) {
  const items = []
  return {
    items,
    offer(rank, value) {
      if (items.length === k && value <= items[k - 1].value) return
      const entry = { rank, value }
      let i = items.length - 1
      items.push(entry)
      while (i >= 0 && items[i].value < value) {
        items[i + 1] = items[i]
        items[i] = entry
        i -= 1
      }
      if (items.length > k) items.pop()
    },
  }
}

// 중복 없는 6개를 뽑아 combo에 정렬된 상태로 채운다. deck은 호출 후 원래 상태로 복원된다.
function drawInto(combo, deck, swapped) {
  for (let i = 0; i < PICK; i += 1) {
    const j = i + ((Math.random() * (NUMBERS - i)) | 0)
    swapped[i] = j
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  for (let i = 0; i < PICK; i += 1) {
    const v = deck[i]
    let j = i - 1
    while (j >= 0 && combo[j] > v) {
      combo[j + 1] = combo[j]
      j -= 1
    }
    combo[j + 1] = v
  }
  for (let i = PICK - 1; i >= 0; i -= 1) {
    const j = swapped[i]
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
}

// ---------------------------------------------------------------- 실행 모드

function reportTop(title, entries) {
  console.log(`\n=== ${title} ===`)
  for (const [index, { rank, value }] of entries.entries()) {
    const text = combinationOf(rank)
      .map((n) => String(n).padStart(2, '0'))
      .join(' ')
    console.log(`${index + 1}위  ${text}   패턴점수 ${value.toFixed(4)}`)
  }
}

async function runPrediction() {
  const draws = await loadDraws({ refresh: args.has('refresh'), verbose: true })
  const baseline = computeBaseline()
  const model = buildModel(draws, baseline)
  const score = makeScorer(model)
  const nextDraw = draws.length + 1

  console.log(`\n1~${draws.length}회 패턴으로 ${nextDraw}회차 후보를 채점한다 (축소상수 k=${kappa})`)

  const startedAt = Date.now()
  const scored = new Uint8Array(TOTAL_COMBINATIONS) // 같은 조합 중복 채점 방지
  const top = makeTopK(topCount)
  let distinct = 0

  if (args.has('exhaustive')) {
    console.log('완전탐색: 8,145,060개 조합 전체를 채점한다')
    forEachCombination((combo) => {
      distinct += 1
      top.offer(rankOf(combo), score(combo))
    })
  } else {
    console.log(`${drawCount.toLocaleString('ko-KR')}개 후보를 무작위 생성해 채점한다`)
    const deck = new Uint8Array(NUMBERS)
    for (let i = 0; i < NUMBERS; i += 1) deck[i] = i + 1
    const swapped = new Uint8Array(PICK)
    const combo = new Uint8Array(PICK)

    for (let t = 0; t < drawCount; t += 1) {
      drawInto(combo, deck, swapped)

      const rank = rankOf(combo)
      if (scored[rank]) continue // 이미 채점한 조합이면 점수가 같으므로 건너뛴다
      scored[rank] = 1
      distinct += 1
      top.offer(rank, score(combo))

      if ((t + 1) % 20_000_000 === 0) {
        console.log(
          `  ${(t + 1).toLocaleString('ko-KR')}개 생성 / 서로 다른 조합 ${distinct.toLocaleString('ko-KR')}개`,
        )
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  reportTop(`${nextDraw}회차 패턴점수 상위 ${topCount}개`, top.items)
  console.log(
    `\n서로 다른 조합 ${distinct.toLocaleString('ko-KR')}개 채점 ` +
      `(전체 조합의 ${((distinct / TOTAL_COMBINATIONS) * 100).toFixed(3)}%) / ${elapsed}초`,
  )
  if (top.items.length > 0) explain(model, Uint8Array.from(combinationOf(top.items[0].rank)))
  console.log('\n검증 필요: --backtest 로 이 모델의 실제 예측력을 측정할 수 있다.')
}

// 1..t회로 학습한 모델이 실제 t+1회를 얼마나 높게 평가했는지 백분위로 측정한다.
// 예측력이 없으면 평균 백분위는 50%가 된다.
async function runBacktest() {
  const draws = await loadDraws({ refresh: args.has('refresh'), verbose: true })
  const baseline = computeBaseline()
  const from = argNum('from', 640)
  const probes = argNum('probes', 20_000)

  console.log(
    `\n백테스트: ${from + 1}회 ~ ${draws.length}회를 각각 직전 회차까지의 데이터로 예측 ` +
      `(회차당 무작위 표본 ${probes.toLocaleString('ko-KR')}개와 비교)`,
  )

  const percentiles = []
  const deck = new Uint8Array(NUMBERS)
  const swapped = new Uint8Array(PICK)
  const probe = new Uint8Array(PICK)

  for (let t = from; t < draws.length; t += 1) {
    const model = buildModel(draws.slice(0, t), baseline)
    const score = makeScorer(model)
    const actual = score(Uint8Array.from(draws[t].nums))

    for (let i = 0; i < NUMBERS; i += 1) deck[i] = i + 1
    let below = 0
    for (let p = 0; p < probes; p += 1) {
      drawInto(probe, deck, swapped)
      if (score(probe) < actual) below += 1
    }
    percentiles.push((below / probes) * 100)
  }

  const n = percentiles.length
  const mean = percentiles.reduce((s, v) => s + v, 0) / n
  const sd = Math.sqrt(percentiles.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
  const se = sd / Math.sqrt(n)
  const z = (mean - 50) / se

  console.log(`\n=== 백테스트 결과 (${n}회차) ===`)
  console.log(`실제 당첨조합의 평균 백분위: ${mean.toFixed(2)}% (예측력이 없으면 50%)`)
  console.log(`표준오차 ${se.toFixed(2)}%p / z = ${z.toFixed(2)}`)
  console.log(`상위 10% 안에 든 회차: ${percentiles.filter((v) => v >= 90).length}회 (우연이면 ${(n * 0.1).toFixed(0)}회)`)
  console.log(`하위 10%에 든 회차: ${percentiles.filter((v) => v <= 10).length}회 (우연이면 ${(n * 0.1).toFixed(0)}회)`)
  console.log(
    Math.abs(z) < 2
      ? '\n판정: 무작위와 통계적으로 구별되지 않는다. 이 패턴 모델은 예측력이 없다.'
      : '\n판정: 유의한 편향이 관측됐다. 데이터 처리 오류 가능성을 먼저 검토해야 한다.',
  )
}

// 과거 N개 회차에 대해 "그 시점까지의 데이터만으로 뽑은 상위 K개"를 실제 당첨번호와 대조한다.
// 백분위(--backtest)가 추상적이라면 이쪽은 등수로 바로 보여준다.
async function runCheck() {
  const draws = await loadDraws({ refresh: args.has('refresh'), verbose: true })
  const baseline = computeBaseline()
  const rounds = argNum('check', 30)
  const from = Math.max(1, draws.length - rounds)

  const rankName = (matched, hasBonus) => {
    if (matched === 6) return '1등'
    if (matched === 5) return hasBonus ? '2등' : '3등'
    if (matched === 4) return '4등'
    if (matched === 3) return '5등'
    return '낙첨'
  }

  console.log(`\n실전 검증: ${from + 1}회 ~ ${draws.length}회 (${draws.length - from}개 회차)`)
  console.log(`각 회차마다 직전 회차까지의 데이터로 상위 ${topCount}개를 뽑아 실제 당첨번호와 대조한다\n`)

  const deck = new Uint8Array(NUMBERS)
  const swapped = new Uint8Array(PICK)
  const randomPick = new Uint8Array(PICK)

  let modelTickets = 0
  let modelMatched = 0
  let modelWins = 0
  let randomTickets = 0
  let randomMatched = 0
  let randomWins = 0
  const modelBest = []

  for (let t = from; t < draws.length; t += 1) {
    const model = buildModel(draws.slice(0, t), baseline)
    const score = makeScorer(model)
    const top = makeTopK(topCount)
    forEachCombination((combo) => top.offer(rankOf(combo), score(combo)))

    const actual = new Set(draws[t].nums)
    const bonus = draws[t].bonus
    let best = 0
    for (const { rank } of top.items) {
      const nums = combinationOf(rank)
      const matched = nums.filter((v) => actual.has(v)).length
      modelTickets += 1
      modelMatched += matched
      if (matched >= 3) modelWins += 1
      best = Math.max(best, matched)
    }
    modelBest.push(best)

    // 같은 장수만큼 무작위로 사본 경우를 대조군으로 둔다.
    for (let i = 0; i < NUMBERS; i += 1) deck[i] = i + 1
    for (let i = 0; i < topCount; i += 1) {
      drawInto(randomPick, deck, swapped)
      const matched = [...randomPick].filter((v) => actual.has(v)).length
      randomTickets += 1
      randomMatched += matched
      if (matched >= 3) randomWins += 1
    }

    const bestTicket = top.items
      .map(({ rank }) => combinationOf(rank))
      .reduce((a, b) => (b.filter((v) => actual.has(v)).length > a.filter((v) => actual.has(v)).length ? b : a))
    const bestMatched = bestTicket.filter((v) => actual.has(v)).length
    console.log(
      `  ${draws[t].no}회  실제 ${draws[t].nums.map((v) => String(v).padStart(2, '0')).join(' ')}` +
        `  |  최고 ${bestTicket.map((v) => String(v).padStart(2, '0')).join(' ')}` +
        `  ${bestMatched}개 ${rankName(bestMatched, bestTicket.includes(bonus))}`,
    )
  }

  const expectedPerTicket = (PICK * PICK) / NUMBERS
  const winRate = (choose(PICK, 3) * choose(NUMBERS - PICK, 3)) / TOTAL_COMBINATIONS

  console.log(`\n=== 실전 검증 결과 (${draws.length - from}회차 × ${topCount}장 = ${modelTickets}장) ===`)
  console.log(`패턴 모델   평균 ${(modelMatched / modelTickets).toFixed(3)}개 일치 / 5등 이상 ${modelWins}장`)
  console.log(`무작위 대조 평균 ${(randomMatched / randomTickets).toFixed(3)}개 일치 / 5등 이상 ${randomWins}장`)
  console.log(`이론 기대값 평균 ${expectedPerTicket.toFixed(3)}개 일치 / 5등 이상 ${(modelTickets * winRate).toFixed(1)}장`)
  console.log(`회차별 최고 일치 개수 분포: ${[0, 1, 2, 3, 4, 5, 6].map((k) => `${k}개 ${modelBest.filter((v) => v === k).length}회`).join(' / ')}`)
  console.log('\n모델이 무작위보다 낫다면 평균 일치 개수가 뚜렷하게 높아야 한다. 그렇지 않다면 예측력이 없다는 뜻이다.')
}

if (args.has('backtest')) await runBacktest()
else if (args.has('check')) await runCheck()
else await runPrediction()
