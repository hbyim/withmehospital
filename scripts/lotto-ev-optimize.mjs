// 사람들이 덜 고르는 조합을 찾아 1등 기대 당첨금을 최대화한다.
//
// 번호가 나올 확률은 조합마다 똑같지만, 당첨금은 1등끼리 나눠 갖기 때문에
// "남들이 안 고르는 조합"을 사면 기대 수령액이 올라간다. 이건 추첨의 무작위성과
// 무관하게 성립하는, 검증 가능한 실제 신호다.
//
// 근거: 1등 당첨자 수를 자동/수동으로 나눠 보면 자동(기계 선택)은 포아송 분포와
// 일치하지만 수동(사람 선택)은 분산이 3배 이상 크다. 사람이 특정 조합에 쏠린다는 뜻이다.
//
// 모델: 수동 당첨자 수 y_t ~ Poisson(M_t * q(조합)), q는 조합의 인기도 분포.
//       log q(c) = B·x(c) - log Z 를 포아송 우도로 적합한다.
//
// 사용법: node scripts/lotto-ev-optimize.mjs [--top=10] [--holdout=240]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDraws, PICK_TYPE_FROM } from './lotto-history.mjs'

const PICK = 6
const TOTAL_COMBINATIONS = 8_145_060
const TICKET_PRICE = 1000

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bucketPath = join(root, '.cache/lotto-popularity-buckets.json')

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)
const argNum = (key, fallback) => (args.has(key) ? Number(args.get(key)) : fallback)

const topCount = argNum('top', 10)
const holdout = argNum('holdout', 240)

// ---------------------------------------------------------------- 인기도 특성

// 로또 용지는 1~45가 7열로 배열돼 있다. 같은 열/행에 몰린 조합은 사람이 줄 긋듯 고르기 쉽다.
const columnOf = (n) => (n - 1) % 7
const rowOf = (n) => Math.floor((n - 1) / 7)

function maxGroupSize(combo, groupOf, groups) {
  const tally = new Array(groups).fill(0)
  let best = 0
  for (let i = 0; i < PICK; i += 1) {
    const g = groupOf(combo[i])
    tally[g] += 1
    if (tally[g] > best) best = tally[g]
  }
  return best
}

// 각 특성은 작은 정수값을 갖는다. [추출 함수, 값의 개수, 오프셋, 라벨]
const FEATURES = [
  { key: 'birthday', label: '1~31 (생일 범위) 개수', size: 7, offset: 0, of: (c) => c.reduce((s, n) => s + (n <= 31 ? 1 : 0), 0) },
  { key: 'month', label: '1~12 (월 범위) 개수', size: 7, offset: 0, of: (c) => c.reduce((s, n) => s + (n <= 12 ? 1 : 0), 0) },
  {
    key: 'sum',
    label: '번호 합계(10 단위)',
    size: 24,
    offset: 2,
    of: (c) => ((c[0] + c[1] + c[2] + c[3] + c[4] + c[5]) / 10) | 0,
  },
  {
    key: 'consecutive',
    label: '연속번호 쌍 개수',
    size: 6,
    offset: 0,
    of: (c) => {
      let n = 0
      for (let i = 1; i < PICK; i += 1) if (c[i] === c[i - 1] + 1) n += 1
      return n
    },
  },
  { key: 'column', label: '용지 같은 열에 몰린 최다 개수', size: 6, offset: 1, of: (c) => maxGroupSize(c, columnOf, 7) },
  { key: 'row', label: '용지 같은 행에 몰린 최다 개수', size: 6, offset: 1, of: (c) => maxGroupSize(c, rowOf, 7) },
  {
    key: 'evenGap',
    label: '번호 간격의 불규칙성',
    size: 16,
    offset: 0,
    of: (c) => {
      let mean = 0
      for (let i = 1; i < PICK; i += 1) mean += c[i] - c[i - 1]
      mean /= PICK - 1
      let variance = 0
      for (let i = 1; i < PICK; i += 1) variance += (c[i] - c[i - 1] - mean) ** 2
      return Math.min(15, Math.round(Math.sqrt(variance / (PICK - 1))))
    },
  },
  { key: 'sameDigit', label: '같은 끝수 최다 개수', size: 6, offset: 1, of: (c) => maxGroupSize(c, (n) => n % 10, 10) },
  { key: 'spread', label: '번호 범위(최대-최소, 5 단위)', size: 9, offset: 0, of: (c) => ((c[5] - c[0]) / 5) | 0 },
]

const FEATURE_COUNT = FEATURES.length

function featureVector(combo, out = new Int32Array(FEATURE_COUNT)) {
  for (let i = 0; i < FEATURE_COUNT; i += 1) out[i] = FEATURES[i].of(combo) - FEATURES[i].offset
  return out
}

function encode(vector) {
  let key = 0
  for (let i = 0; i < FEATURE_COUNT; i += 1) {
    if (vector[i] < 0 || vector[i] >= FEATURES[i].size) {
      throw new Error(`${FEATURES[i].key} 값이 범위를 벗어남: ${vector[i] + FEATURES[i].offset}`)
    }
    key = key * FEATURES[i].size + vector[i]
  }
  return key
}

function decode(key) {
  const vector = new Int32Array(FEATURE_COUNT)
  let rest = key
  for (let i = FEATURE_COUNT - 1; i >= 0; i -= 1) {
    vector[i] = rest % FEATURES[i].size
    rest = Math.floor(rest / FEATURES[i].size)
  }
  return vector
}

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

// 8,145,060개 조합을 특성벡터가 같은 것끼리 묶는다. 이후 계산은 이 버킷 단위로만 하면 된다.
function loadBuckets() {
  if (existsSync(bucketPath)) {
    const cached = JSON.parse(readFileSync(bucketPath, 'utf8'))
    if (cached.version === 1 && cached.featureCount === FEATURE_COUNT) {
      return { keys: Int32Array.from(cached.keys), sizes: Float64Array.from(cached.sizes) }
    }
  }

  const tally = new Map()
  const vector = new Int32Array(FEATURE_COUNT)
  forEachCombination((combo) => {
    const key = encode(featureVector(combo, vector))
    tally.set(key, (tally.get(key) ?? 0) + 1)
  })

  const keys = Int32Array.from(tally.keys())
  const sizes = Float64Array.from(keys, (key) => tally.get(key))
  mkdirSync(dirname(bucketPath), { recursive: true })
  writeFileSync(bucketPath, JSON.stringify({ version: 1, featureCount: FEATURE_COUNT, keys: [...keys], sizes: [...sizes] }))
  return { keys, sizes }
}

// ---------------------------------------------------------------- 모델 적합

// 버킷별 특성행렬. 수치 안정성을 위해 조합공간 평균을 빼서 중심화한다.
function buildDesign(buckets) {
  const { keys, sizes } = buckets
  const rows = keys.length
  const design = new Float64Array(rows * FEATURE_COUNT)
  for (let r = 0; r < rows; r += 1) {
    const vector = decode(keys[r])
    for (let j = 0; j < FEATURE_COUNT; j += 1) design[r * FEATURE_COUNT + j] = vector[j]
  }

  const mean = new Float64Array(FEATURE_COUNT)
  for (let r = 0; r < rows; r += 1) {
    for (let j = 0; j < FEATURE_COUNT; j += 1) mean[j] += design[r * FEATURE_COUNT + j] * sizes[r]
  }
  for (let j = 0; j < FEATURE_COUNT; j += 1) mean[j] /= TOTAL_COMBINATIONS

  const sd = new Float64Array(FEATURE_COUNT)
  for (let r = 0; r < rows; r += 1) {
    for (let j = 0; j < FEATURE_COUNT; j += 1) {
      sd[j] += (design[r * FEATURE_COUNT + j] - mean[j]) ** 2 * sizes[r]
    }
  }
  for (let j = 0; j < FEATURE_COUNT; j += 1) sd[j] = Math.sqrt(sd[j] / TOTAL_COMBINATIONS) || 1

  for (let r = 0; r < rows; r += 1) {
    for (let j = 0; j < FEATURE_COUNT; j += 1) {
      design[r * FEATURE_COUNT + j] = (design[r * FEATURE_COUNT + j] - mean[j]) / sd[j]
    }
  }
  return { design, rows, mean, sd }
}

const standardize = (vector, mean, sd) =>
  Float64Array.from({ length: FEATURE_COUNT }, (_, j) => (vector[j] - mean[j]) / sd[j])

// q(버킷) = exp(B·x) / Z 와, 특성별 조합공간 기대값을 함께 구한다.
function popularityOf(beta, design, rows, sizes) {
  const logits = new Float64Array(rows)
  let max = -Infinity
  for (let r = 0; r < rows; r += 1) {
    let dot = 0
    for (let j = 0; j < FEATURE_COUNT; j += 1) dot += beta[j] * design[r * FEATURE_COUNT + j]
    logits[r] = dot
    if (dot > max) max = dot
  }

  let normalizer = 0
  const weights = new Float64Array(rows)
  for (let r = 0; r < rows; r += 1) {
    weights[r] = Math.exp(logits[r] - max) * sizes[r]
    normalizer += weights[r]
  }

  // expected[j] = 조합 하나를 인기도 분포에서 뽑았을 때 특성 j의 기대값
  const expected = new Float64Array(FEATURE_COUNT)
  for (let r = 0; r < rows; r += 1) {
    const share = weights[r] / normalizer
    for (let j = 0; j < FEATURE_COUNT; j += 1) expected[j] += share * design[r * FEATURE_COUNT + j]
  }

  // logQ[r] = 그 버킷에 속한 조합 "하나"의 선택 확률
  const logQ = new Float64Array(rows)
  for (let r = 0; r < rows; r += 1) logQ[r] = logits[r] - max - Math.log(normalizer)
  return { logQ, expected, logNormalizer: max + Math.log(normalizer) }
}

function fit(samples, design, rows, sizes, { iterations = 300, ridge = 1 } = {}) {
  const beta = new Float64Array(FEATURE_COUNT)

  // 정규화 상수를 직접 다뤄 한 번의 패스로 우도와 기울기를 함께 계산한다.
  const objective = (candidate) => {
    const { expected, logNormalizer } = popularityOf(candidate, design, rows, sizes)
    let logLikelihood = 0
    const gradient = new Float64Array(FEATURE_COUNT)

    for (const { x, y, tickets } of samples) {
      let dot = 0
      for (let j = 0; j < FEATURE_COUNT; j += 1) dot += candidate[j] * x[j]
      const lambda = tickets * Math.exp(dot - logNormalizer)
      logLikelihood += y * (Math.log(tickets) + dot - logNormalizer) - lambda
      const residual = y - lambda
      for (let j = 0; j < FEATURE_COUNT; j += 1) gradient[j] += residual * (x[j] - expected[j])
    }

    for (let j = 0; j < FEATURE_COUNT; j += 1) {
      logLikelihood -= (ridge * candidate[j] ** 2) / 2
      gradient[j] -= ridge * candidate[j]
    }
    return { logLikelihood, gradient }
  }

  let current = objective(beta)
  let step = 0.001
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let improved = false
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = Float64Array.from(beta, (v, j) => v + step * current.gradient[j])
      const next = objective(candidate)
      if (next.logLikelihood > current.logLikelihood) {
        beta.set(candidate)
        current = next
        step *= 1.3
        improved = true
        break
      }
      step /= 2
    }
    if (!improved) break
    const norm = Math.sqrt(current.gradient.reduce((s, v) => s + v * v, 0))
    if (norm < 1e-6) break
  }
  return { beta, logLikelihood: current.logLikelihood }
}

// ---------------------------------------------------------------- 실행

const draws = await loadDraws({ refresh: args.has('refresh'), verbose: true })
const usable = draws.filter((d) => d.no >= PICK_TYPE_FROM && d.sales > 0 && d.pickType)

console.log(`\n인기도 모델 학습 데이터: ${usable[0].no}회 ~ ${usable.at(-1).no}회 (${usable.length}회차)`)

// 수동 티켓 비중 추정: 균등선택이라면 수동 당첨자 수는 (수동 티켓 수 / 전체 조합 수) 만큼 나온다.
const uniformWinners = usable.reduce((s, d) => s + d.sales / TICKET_PRICE / TOTAL_COMBINATIONS, 0)
const manualFraction = usable.reduce((s, d) => s + d.pickType.manual, 0) / uniformWinners
const autoFraction = usable.reduce((s, d) => s + d.pickType.auto, 0) / uniformWinners
console.log(`티켓 구성 추정: 자동 ${(autoFraction * 100).toFixed(1)}% / 수동 ${(manualFraction * 100).toFixed(1)}%`)

const buckets = loadBuckets()
const { design, rows, mean, sd } = buildDesign(buckets)
console.log(`조합 ${TOTAL_COMBINATIONS.toLocaleString('ko-KR')}개를 특성이 같은 ${rows.toLocaleString('ko-KR')}개 그룹으로 압축`)

const samples = usable.map((draw) => ({
  no: draw.no,
  x: standardize(featureVector(draw.nums), mean, sd),
  y: draw.pickType.manual,
  tickets: (draw.sales / TICKET_PRICE) * manualFraction,
  draw,
}))

// ---- 검증: 앞부분으로 학습하고 뒷부분으로 시험한다
const splitAt = Math.max(1, samples.length - holdout)
const trainSet = samples.slice(0, splitAt)
const testSet = samples.slice(splitAt)

console.log(`\n=== 검증: ${trainSet[0].no}~${trainSet.at(-1).no}회로 학습 → ${testSet[0].no}~${testSet.at(-1).no}회로 시험 ===`)

const trained = fit(trainSet, design, rows, buckets.sizes)
const { logNormalizer: trainedNorm } = popularityOf(trained.beta, design, rows, buckets.sizes)

const predictLambda = (beta, logNormalizer, sample) => {
  let dot = 0
  for (let j = 0; j < FEATURE_COUNT; j += 1) dot += beta[j] * sample.x[j]
  return sample.tickets * Math.exp(dot - logNormalizer)
}

const poissonLogLikelihood = (lambda, y) => y * Math.log(lambda) - lambda
let modelLL = 0
let nullLL = 0
for (const sample of testSet) {
  modelLL += poissonLogLikelihood(predictLambda(trained.beta, trainedNorm, sample), sample.y)
  nullLL += poissonLogLikelihood(sample.tickets / TOTAL_COMBINATIONS, sample.y)
}

const predictions = testSet.map((sample) => ({
  sample,
  lambda: predictLambda(trained.beta, trainedNorm, sample),
  baseline: sample.tickets / TOTAL_COMBINATIONS,
}))
predictions.sort((a, b) => a.lambda / a.baseline - b.lambda / b.baseline)

console.log(`시험 구간 포아송 로그우도: 모델 ${modelLL.toFixed(1)} vs 균등가정 ${nullLL.toFixed(1)} (클수록 좋음, 차이 ${(modelLL - nullLL).toFixed(1)})`)

// 5등분해서 각 구간의 예측값과 실제값이 같이 움직이는지 본다.
// 모델이 진짜 인기도를 잡아냈다면 두 열이 나란히 증가해야 한다.
const binCount = 5
const binSize = Math.floor(predictions.length / binCount)
console.log(`\n시험 구간 ${testSet.length}회차를 모델 예측 인기도 순으로 ${binCount}등분:`)
console.log('  구간            모델 예측    실제 관측    균등가정')
for (let b = 0; b < binCount; b += 1) {
  const group = predictions.slice(b * binSize, b === binCount - 1 ? predictions.length : (b + 1) * binSize)
  const actual = group.reduce((s, p) => s + p.sample.y, 0) / group.length
  const predicted = group.reduce((s, p) => s + p.lambda, 0) / group.length
  const uniform = group.reduce((s, p) => s + p.baseline, 0) / group.length
  const label = b === 0 ? '가장 비인기' : b === binCount - 1 ? '가장 인기' : `${b + 1}번째`
  console.log(
    `  ${label.padEnd(14)}${predicted.toFixed(2).padStart(7)}명${actual.toFixed(2).padStart(11)}명${uniform.toFixed(2).padStart(11)}명`,
  )
}
console.log('  (수동 선택 1등 당첨자 수. 균등가정 열은 사람이 무작위로 고른다고 볼 때의 값)')

// ---- 전체 데이터로 최종 학습
const final = fit(samples, design, rows, buckets.sizes)
const { logQ } = popularityOf(final.beta, design, rows, buckets.sizes)

const bucketIndexOf = new Map()
for (let r = 0; r < rows; r += 1) bucketIndexOf.set(buckets.keys[r], r)

const format = (combo) => combo.map((n) => String(n).padStart(2, '0')).join(' ')
const popularityRatio = (combo) =>
  Math.exp(logQ[bucketIndexOf.get(encode(featureVector(combo)))]) * TOTAL_COMBINATIONS

// 특성들이 서로 얽혀 있어(예: 낮은 번호가 많으면 합계도 작다) 계수 하나만 떼어 읽으면 오해하기 쉽다.
// 실제 조합을 넣어 인기도가 몇 배인지 보는 편이 정확하다.
console.log('\n=== 조합 유형별 인기도 (1.0 = 평균적인 조합, 클수록 많이 고름) ===')
const examples = [
  ['연속 6개 (낮은 쪽)', [1, 2, 3, 4, 5, 6]],
  ['연속 6개 (높은 쪽)', [40, 41, 42, 43, 44, 45]],
  ['등간격 (7씩)', [3, 10, 17, 24, 31, 38]],
  ['전부 한 자리 + 10번대', [1, 2, 3, 11, 12, 13]],
  ['전부 생일 범위 (1~31)', [3, 8, 14, 19, 25, 31]],
  ['고르게 퍼진 조합', [4, 12, 21, 29, 36, 44]],
  ['최근 1241회 당첨번호', [7, 13, 16, 23, 24, 43]],
]
for (const [label, combo] of examples) {
  const ratio = popularityRatio(combo)
  console.log(`  ${label.padEnd(24)} ${format(combo)}   ${ratio.toFixed(2)}배`)
}

// ---- 기대 당첨금 계산
const recent = usable.slice(-52)
const recentTickets = recent.reduce((s, d) => s + d.sales / TICKET_PRICE, 0) / recent.length
const recentPool = recent.reduce((s, d) => s + d.firstPrize * d.firstWinners, 0) / recent.length
const uniformTickets = recentTickets * (1 - manualFraction)
const manualTickets = recentTickets * manualFraction

// 1등 당첨 시 나 말고 다른 당첨자 수 N ~ Poisson(lambda). 기대 수령액 = pool * E[1/(1+N)]
const expectedPrize = (lambda) => (recentPool * (1 - Math.exp(-lambda))) / lambda
const averageLambda = recentTickets / TOTAL_COMBINATIONS
console.log(`\n=== 기대 1등 당첨금 (최근 52회 평균: 판매 ${(recentTickets / 1e6).toFixed(1)}백만장, 1등 총액 ${(recentPool / 1e8).toFixed(0)}억원) ===`)

// 역대 당첨번호가 실제로 관측된 인기도 범위. 이보다 극단적인 조합은 모델 밖 외삽이다.
const observedMinRatio = Math.min(...samples.map((sample) => popularityRatio(sample.draw.nums)))

const vector = new Int32Array(FEATURE_COUNT)
let bestLambda = Infinity
let worstLambda = -Infinity
let bestCombo = null
let worstCombo = null
const coldest = []
const supported = []

const offer = (list, entry) => {
  if (list.length < topCount) {
    list.push(entry)
    list.sort((a, b) => a.lambda - b.lambda)
  } else if (entry.lambda < list[topCount - 1].lambda) {
    list[topCount - 1] = entry
    list.sort((a, b) => a.lambda - b.lambda)
  }
}

forEachCombination((combo) => {
  const r = bucketIndexOf.get(encode(featureVector(combo, vector)))
  const ratio = Math.exp(logQ[r]) * TOTAL_COMBINATIONS
  const lambda = uniformTickets / TOTAL_COMBINATIONS + manualTickets * Math.exp(logQ[r])
  if (lambda < bestLambda) {
    bestLambda = lambda
    bestCombo = [...combo]
  }
  if (lambda > worstLambda) {
    worstLambda = lambda
    worstCombo = [...combo]
  }
  offer(coldest, { combo: [...combo], lambda, ratio })
  if (ratio >= observedMinRatio) offer(supported, { combo: [...combo], lambda, ratio })
})

const baselinePrize = expectedPrize(averageLambda)
console.log(`평균적인 조합    기대 경쟁자 ${averageLambda.toFixed(2)}명 / 기대 수령액 ${(baselinePrize / 1e8).toFixed(2)}억원`)
console.log(`가장 인기 조합   ${format(worstCombo)}  경쟁자 ${worstLambda.toFixed(2)}명 / ${(expectedPrize(worstLambda) / 1e8).toFixed(2)}억원`)
console.log(`가장 비인기 조합 ${format(bestCombo)}  경쟁자 ${bestLambda.toFixed(2)}명 / ${(expectedPrize(bestLambda) / 1e8).toFixed(2)}억원`)
console.log(`-> 비인기 조합을 고르면 평균 대비 기대 수령액 ${(((expectedPrize(bestLambda) - baselinePrize) / baselinePrize) * 100).toFixed(1)}% 증가`)

console.log(`\n=== 기대 수령액 최상위 ${topCount}개 (이론적 최적, 단 모델 밖 외삽) ===`)
for (const [index, { combo, lambda, ratio }] of coldest.entries()) {
  console.log(
    `${String(index + 1).padStart(2)}위  ${format(combo)}   인기도 ${ratio.toFixed(2)}배   경쟁자 ${lambda.toFixed(2)}명   ${(expectedPrize(lambda) / 1e8).toFixed(2)}억원`,
  )
}

// 최적 조합은 수없이 많고 인기도가 전부 같다(특성이 같으면 인기도도 같다).
// 그래서 같은 값 안에서 서로 번호가 겹치지 않는 것들을 골라야 실제로 여러 장 살 수 있다.
const targetLambda = supported[0].lambda
const tolerance = 1.005 // 기대 수령액 0.5% 손해까지 허용해 후보 폭을 넓힌다
let tiedCount = 0
const pool = []
const poolLimit = 60_000

// mulberry32: 같은 데이터면 같은 추천이 나오도록 시드를 고정한다.
let seed = 20260914
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

forEachCombination((combo) => {
  const r = bucketIndexOf.get(encode(featureVector(combo, vector)))
  const ratio = Math.exp(logQ[r]) * TOTAL_COMBINATIONS
  if (ratio < observedMinRatio) return
  const lambda = uniformTickets / TOTAL_COMBINATIONS + manualTickets * Math.exp(logQ[r])
  if (lambda > targetLambda * tolerance) return

  tiedCount += 1
  // 저수지 표본추출: 후보가 수백만 개여도 메모리를 일정하게 유지하면서 고르게 뽑는다.
  if (pool.length < poolLimit) pool.push({ combo: [...combo], lambda, ratio })
  else {
    const slot = Math.floor(random() * tiedCount)
    if (slot < poolLimit) pool[slot] = { combo: [...combo], lambda, ratio }
  }
})

// 열거 순서대로 고르면 앞 번호에 쏠리므로 섞은 뒤 고른다.
for (let i = pool.length - 1; i > 0; i -= 1) {
  const j = Math.floor(random() * (i + 1))
  ;[pool[i], pool[j]] = [pool[j], pool[i]]
}
pool.sort((a, b) => a.lambda - b.lambda || 0)

// 이미 고른 조합과 2개를 넘게 겹치지 않는 것만 차례로 채운다.
const picked = []
for (const candidate of pool) {
  if (picked.length >= topCount) break
  const set = new Set(candidate.combo)
  if (picked.every((chosen) => chosen.combo.filter((n) => set.has(n)).length <= 2)) picked.push(candidate)
}

console.log(`\n=== 실제 관측 범위 안에서 가장 좋은 조합 ${picked.length}개 (권장) ===`)
console.log(`역대 당첨번호가 실제로 나왔던 최저 인기도 ${observedMinRatio.toFixed(2)}배 이상만 골랐고,`)
console.log(`동점 조합 ${tiedCount.toLocaleString('ko-KR')}개 중 서로 2개까지만 겹치도록 분산시켰다`)
for (const [index, { combo, lambda, ratio }] of picked.entries()) {
  console.log(
    `${String(index + 1).padStart(2)}번  ${format(combo)}   인기도 ${ratio.toFixed(2)}배   경쟁자 ${lambda.toFixed(2)}명   ${(expectedPrize(lambda) / 1e8).toFixed(2)}억원`,
  )
}
const gain = ((expectedPrize(targetLambda) - baselinePrize) / baselinePrize) * 100
console.log(`-> 평균 대비 기대 수령액 ${gain.toFixed(1)}% 증가 (외삽 없이 데이터로 뒷받침되는 수치)`)

// 추천 조합은 특성 공간의 끝에 있다. 그 영역을 뒷받침하는 실제 관측이 있는지 확인한다.
const historicalRatios = samples
  .map((sample) => ({ sample, ratio: popularityRatio(sample.draw.nums) }))
  .sort((a, b) => a.ratio - b.ratio)
const recommendedRatio = popularityRatio(bestCombo)
const belowRecommended = historicalRatios.filter((r) => r.ratio <= recommendedRatio)
const bottomTenth = historicalRatios.slice(0, Math.floor(historicalRatios.length / 10))

console.log('\n=== 추천 조합의 근거가 되는 관측 (외삽 위험 점검) ===')
console.log(`추천 조합의 인기도 ${recommendedRatio.toFixed(2)}배는 역대 ${samples.length}회 당첨번호 중 ${belowRecommended.length}회보다 낮다`)
{
  const predicted = bottomTenth.reduce((s, r) => s + r.sample.tickets * r.ratio / TOTAL_COMBINATIONS, 0) / bottomTenth.length
  const actual = bottomTenth.reduce((s, r) => s + r.sample.y, 0) / bottomTenth.length
  const uniform = bottomTenth.reduce((s, r) => s + r.sample.tickets / TOTAL_COMBINATIONS, 0) / bottomTenth.length
  console.log(
    `역대 당첨번호 중 인기도 하위 10% (${bottomTenth.length}회): 모델 예측 ${predicted.toFixed(2)}명 / 실제 ${actual.toFixed(2)}명 / 균등가정 ${uniform.toFixed(2)}명`,
  )
  console.log(`  (추천 조합 ${recommendedRatio.toFixed(2)}배가 이 구간보다 훨씬 극단적이면 모델 밖 외삽이니 주의해야 한다)`)
}

console.log('\n주의: 당첨 확률은 어떤 조합이든 8,145,060분의 1로 같다. 달라지는 것은 당첨됐을 때 받는 금액뿐이다.')
