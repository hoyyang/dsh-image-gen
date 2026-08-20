// Wraps the raw tsdown CJS bundle in the web shell's __ModuleLoader__ contract
// and emits it as lib/client.js (the path DSH host-side client modules expect).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'client', 'client.js')
const target = join(root, 'lib', 'client.js')
const ID = '@dsh-external/dsh-image-gen/client'

const body = readFileSync(source, 'utf8')
const wrapped = [
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(ID)},`,
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  body
      .split('\n')
      .map((line) => '\t\t' + line)
      .join('\n'),
  '\t\treturn module.exports;',
  '\t},',
  '});',
  '',
].join('\n')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, wrapped)
if (!wrapped.includes('__ModuleLoader__')) {
  console.error('wrap-client-banner: marker missing — aborting')
  process.exit(1)
}
console.log('client banner wrapped -> lib/client.js')
