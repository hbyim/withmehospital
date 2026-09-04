import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'dist')
const customer = join(root, 'apps/customer/dist')
const manager = join(root, 'apps/manager/dist')

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(customer, out, { recursive: true })
mkdirSync(join(out, 'manager'), { recursive: true })
cpSync(manager, join(out, 'manager'), { recursive: true })

writeFileSync(
  join(out, 'index-apps.html'),
  `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>위드유 데모</title>
  <style>
    :root {
      --ink: #142423;
      --muted: #5d6f6d;
      --brand: #1a7a72;
      --line: rgba(20, 36, 35, 0.08);
      --shadow: 0 18px 50px rgba(15, 82, 77, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background:
        radial-gradient(ellipse 80% 50% at 10% -10%, #bfe8e0 0%, transparent 55%),
        linear-gradient(165deg, #e8f4f1 0%, #f4f7f6 100%);
    }
    .portal {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px 16px;
    }
    .portal-card {
      width: min(100%, 720px);
      padding: clamp(24px, 4vw, 40px);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(1.5rem, 4vw, 2rem);
    }
    p.lead {
      margin: 0 0 24px;
      color: var(--muted);
    }
    .actions {
      display: grid;
      gap: 12px;
    }
    @media (min-width: 640px) {
      .actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    a {
      display: block;
      padding: 18px 16px;
      border-radius: 16px;
      text-decoration: none;
      color: var(--ink);
      background: linear-gradient(145deg, #fff, #eaf7f4);
      border: 1px solid var(--line);
      transition: transform 0.18s;
    }
    a:hover { transform: translateY(-2px); }
    a strong { display: block; font-size: 1.05rem; margin-bottom: 4px; }
    a span { color: var(--muted); font-size: 0.9rem; }
    a.manager {
      background: linear-gradient(145deg, #1c2430, #2a3a4f);
      color: #f4f7fb;
      border-color: transparent;
    }
    a.manager span { color: rgba(244, 247, 251, 0.72); }
  </style>
</head>
<body>
  <div class="portal">
    <div class="portal-card">
      <h1>위드유 데모</h1>
      <p class="lead">PC·태블릿·모바일에 맞춘 고객 앱과 매니저 앱입니다.</p>
      <div class="actions">
        <a href="./">
          <strong>위드유 (고객)</strong>
          <span>병원 동행·돌봄 예약</span>
        </a>
        <a class="manager" href="./manager/">
          <strong>위드유 매니저</strong>
          <span>요청 수락·일정 관리</span>
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`,
)

console.log('Assembled dist/: customer at / , manager at /manager/')
