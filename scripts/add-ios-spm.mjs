/**
 * Capacitor `cap add ios --packagemanager SPM` has a case bug
 * (lowercases to "spm" then compares to "SPM"), so we add iOS via SPM ourselves.
 *
 * Usage (repo root):
 *   node scripts/add-ios-spm.mjs
 *   node scripts/add-ios-spm.mjs customer   # one app only
 *   node scripts/add-ios-spm.mjs manager
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function addIosSpm(appDir) {
  if (existsSync(resolve(appDir, 'ios'))) {
    console.log(`skip (ios/ exists): ${appDir}`)
    return
  }

  process.chdir(appDir)
  const { loadConfig } = require('@capacitor/cli/dist/config')
  const { addCommand } = require('@capacitor/cli/dist/tasks/add')
  const { resolve: resolvePath } = require('path')

  const config = await loadConfig()
  config.ios.packageManager = Promise.resolve('SPM')
  config.cli.assets.ios.platformTemplateArchive = 'ios-spm-template.tar.gz'
  config.cli.assets.ios.platformTemplateArchiveAbs = resolvePath(
    config.cli.assetsDirAbs,
    'ios-spm-template.tar.gz',
  )

  await addCommand(config, 'ios')
}

const arg = process.argv[2]
const all = [
  ['customer', resolve(root, 'apps/customer-mobile')],
  ['manager', resolve(root, 'apps/manager-mobile')],
]
const targets = arg
  ? all.filter(([name]) => name === arg || name === `${arg}-mobile`)
  : all

if (!targets.length) {
  console.error(`Unknown app "${arg}". Use customer or manager.`)
  process.exit(1)
}

for (const [, dir] of targets) {
  console.log(`\n=== Adding iOS (SPM) in ${dir} ===`)
  await addIosSpm(dir)
}
