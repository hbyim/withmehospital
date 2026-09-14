// 역대 당첨번호가 정말 무작위인지 통계 검정으로 확인한다.
// "패턴이 있다"는 주장을 검증하려면 예측 결과가 아니라 이 검정을 봐야 한다.
//
// 사용법: node scripts/lotto-stats.mjs [--refresh]

import { loadDraws } from './lotto-history.mjs'

const NUMBERS = 45
const PICK = 6
const PAIRS = (NUMBERS * (NUMBERS - 1)) / 2

const draws = await loadDraws({ refresh: process.argv.includes('--refresh'), verbose: true })
const n = draws.length

function choose(total, k) {
  if (k < 0 || k > total) return 0
  let r = 1
  for (let i = 0; i < k; i += 1) r = (r * (total - i)) / (i + 1)
  return r
}

// 카이제곱 통계량을 자유도로 정규화한 z값. |z| < 2 면 무작위와 구별되지 않는다.
const chiSquareZ = (chi, df) => (chi - df) / Math.sqrt(2 * df)

function correlation(a, b) {
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length
  const ma = mean(a)
  const mb = mean(b)
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < a.length; i += 1) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db)
}

const verdict = (z) => (Math.abs(z) < 2 ? '무작위와 구별 안 됨' : '유의한 편향')

console.log(`\n총 ${n}회차 (1~${n}회) 무작위성 검정`)
console.log('='.repeat(64))

// [1] 번호별 출현 빈도가 균등한가
{
  const freq = new Array(NUMBERS + 1).fill(0)
  for (const draw of draws) for (const num of draw.nums) freq[num] += 1
  const expected = (n * PICK) / NUMBERS
  let chi = 0
  for (let num = 1; num <= NUMBERS; num += 1) chi += (freq[num] - expected) ** 2 / expected
  const z = chiSquareZ(chi, NUMBERS - 1)

  const ranked = Array.from({ length: NUMBERS }, (_, i) => [i + 1, freq[i + 1]]).sort((a, b) => b[1] - a[1])
  console.log('\n[1] 번호별 출현 빈도의 균등성')
  console.log(`    번호당 기대 ${expected.toFixed(1)}회 / 실제 범위 ${ranked.at(-1)[1]}~${ranked[0][1]}회`)
  console.log(`    최다: ${ranked.slice(0, 5).map(([v, c]) => `${v}(${c})`).join(' ')}`)
  console.log(`    최소: ${ranked.slice(-5).map(([v, c]) => `${v}(${c})`).join(' ')}`)
  console.log(`    카이제곱 ${chi.toFixed(2)} (자유도 ${NUMBERS - 1}) -> z = ${z.toFixed(2)}  ${verdict(z)}`)
}

// [2] 번호쌍 동시출현이 균등한가 (패턴 모델 점수의 70%를 차지하는 특성)
{
  const pair = new Float64Array((NUMBERS + 1) * (NUMBERS + 1))
  for (const draw of draws) {
    for (let i = 0; i < PICK; i += 1) {
      for (let j = i + 1; j < PICK; j += 1) pair[draw.nums[i] * (NUMBERS + 1) + draw.nums[j]] += 1
    }
  }
  const counts = []
  const labels = []
  for (let a = 1; a <= NUMBERS; a += 1) {
    for (let b = a + 1; b <= NUMBERS; b += 1) {
      counts.push(pair[a * (NUMBERS + 1) + b])
      labels.push(`${a}-${b}`)
    }
  }
  const expected = (n * PICK * (PICK - 1)) / 2 / PAIRS
  let chi = 0
  for (const c of counts) chi += (c - expected) ** 2 / expected
  const z = chiSquareZ(chi, PAIRS - 1)
  const mean = counts.reduce((s, v) => s + v, 0) / counts.length
  const sd = Math.sqrt(counts.reduce((s, v) => s + (v - mean) ** 2, 0) / counts.length)
  const top = counts
    .map((c, i) => [labels[i], c])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  console.log('\n[2] 번호쌍 990개의 동시출현 균등성')
  console.log(`    쌍당 기대 ${expected.toFixed(2)}회 / 실제 표준편차 ${sd.toFixed(2)} (순수 무작위 예상 ${Math.sqrt(expected).toFixed(2)})`)
  console.log(`    최다: ${top.map(([l, c]) => `${l}(${c}회)`).join(' ')}`)
  console.log(`    카이제곱 ${chi.toFixed(1)} (자유도 ${PAIRS - 1}) -> z = ${z.toFixed(2)}  ${verdict(z)}`)
}

// [3] 과거 빈도가 미래 빈도를 예측하는가 (핫넘버 전략의 근거)
{
  const half = Math.floor(n / 2)
  const tally = (subset) => {
    const freq = new Array(NUMBERS + 1).fill(0)
    const pair = new Map()
    for (const draw of subset) {
      for (let i = 0; i < PICK; i += 1) {
        freq[draw.nums[i]] += 1
        for (let j = i + 1; j < PICK; j += 1) {
          const key = `${draw.nums[i]}-${draw.nums[j]}`
          pair.set(key, (pair.get(key) ?? 0) + 1)
        }
      }
    }
    return { freq, pair }
  }
  const first = tally(draws.slice(0, half))
  const second = tally(draws.slice(half))

  const numA = []
  const numB = []
  for (let v = 1; v <= NUMBERS; v += 1) {
    numA.push(first.freq[v])
    numB.push(second.freq[v])
  }
  const pairA = []
  const pairB = []
  for (let a = 1; a <= NUMBERS; a += 1) {
    for (let b = a + 1; b <= NUMBERS; b += 1) {
      pairA.push(first.pair.get(`${a}-${b}`) ?? 0)
      pairB.push(second.pair.get(`${a}-${b}`) ?? 0)
    }
  }

  console.log(`\n[3] 전반기(1~${half}회) 빈도가 후반기(${half + 1}~${n}회) 빈도를 예측하는가`)
  console.log(`    번호 단위 상관계수 r = ${correlation(numA, numB).toFixed(4)}`)
  console.log(`    번호쌍 단위 상관계수 r = ${correlation(pairA, pairB).toFixed(4)}`)
  console.log('    (r이 0 근처면 과거에 많이 나온 번호가 앞으로도 많이 나오지 않는다는 뜻)')
}

// [4] 조합 단위 패턴이 이론 분포와 맞는가
{
  const total = choose(NUMBERS, PICK)
  console.log('\n[4] 조합 패턴의 이론 분포 일치 여부')

  const sums = draws.map((d) => d.nums.reduce((s, v) => s + v, 0))
  const sumMean = sums.reduce((s, v) => s + v, 0) / n
  const sumSd = Math.sqrt(sums.reduce((s, v) => s + (v - sumMean) ** 2, 0) / n)
  console.log(`    합계 평균 ${sumMean.toFixed(2)} / 표준편차 ${sumSd.toFixed(2)}   (이론 138.00 / 32.36)`)

  const oddObserved = new Array(PICK + 1).fill(0)
  for (const draw of draws) oddObserved[draw.nums.filter((v) => v % 2 === 1).length] += 1
  const oddExpected = Array.from({ length: PICK + 1 }, (_, k) => (n * choose(23, k) * choose(22, PICK - k)) / total)
  let oddChi = 0
  for (let k = 0; k <= PICK; k += 1) oddChi += (oddObserved[k] - oddExpected[k]) ** 2 / oddExpected[k]
  console.log(`    홀수 개수 실제 ${oddObserved.join('/')}`)
  console.log(`               이론 ${oddExpected.map((v) => v.toFixed(0)).join('/')}`)
  console.log(`    카이제곱 ${oddChi.toFixed(2)} (자유도 6, 5% 임계값 12.59)  ${oddChi < 12.59 ? '무작위와 구별 안 됨' : '유의한 편향'}`)

  let consecutive = 0
  for (const draw of draws) {
    for (let i = 1; i < PICK; i += 1) {
      if (draw.nums[i] === draw.nums[i - 1] + 1) {
        consecutive += 1
        break
      }
    }
  }
  // 연속번호가 하나도 없는 조합 수 = C(45-6+1, 6)
  const noneRate = choose(NUMBERS - PICK + 1, PICK) / total
  console.log(
    `    연속번호 포함 비율 실제 ${((consecutive / n) * 100).toFixed(1)}%   (이론 ${((1 - noneRate) * 100).toFixed(1)}%)`,
  )
}

console.log(`\n${'='.repeat(64)}`)
console.log('위 검정이 전부 "무작위와 구별 안 됨"이면, 어떤 패턴 모델도 예측력을 가질 수 없다.')
console.log('모델의 실전 성적은 lotto-pattern-predict.mjs --check 로 직접 확인할 수 있다.')
