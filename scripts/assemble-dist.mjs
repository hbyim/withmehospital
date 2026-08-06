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
  <title>모시미+ 데모</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;line-height:1.5}
    a{display:block;padding:16px;margin:12px 0;border-radius:12px;text-decoration:none;color:#142423;background:#e8f4f1}
    a.manager{background:#1c2430;color:#fff}
  </style>
</head>
<body>
  <h1>모시미+ 데모</h1>
  <p>고객 앱과 매니저 앱이 분리되어 있습니다.</p>
  <a href="./">모시미+ (고객 앱)</a>
  <a class="manager" href="./manager/">모시미+ 매니저</a>
</body>
</html>
`,
)

console.log('Assembled dist/: customer at / , manager at /manager/')
