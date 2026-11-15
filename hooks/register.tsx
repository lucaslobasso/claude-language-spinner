import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Entry, View } from '../types'
import { japanese } from './packs/japanese'
import { PAIRS } from './packs/pairs'

const START: View = { index: 0, phase: 0 }
// The shape tag declines a value an earlier version stored (it held base and offset).
const view = atom({ plugin: 'language-spinner', key: 'view' } as const, START, { shape: 'view-2' })

/** The packs that ship with the plugin: a name and a function returning the list. */
const BUILTINS: Record<string, () => Entry[]> = { ...PAIRS, japanese }
const DEFAULT_PACK = 'en-es'
const NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/i
const PACK_TIMEOUT_MS = 15000

/** A pack of the user's own: a command whose standard output is the list, or a JSON file holding it. */
export type PackSpec = { argv: string[]; cwd?: string } | { file: string }
type Packs = Record<string, PackSpec>

/**
 * The entries a pack printed; throws when it is not a JSON list of { text, gloss }.
 * A row may also carry `verb`: rows sharing one are forms of a single word.
 */
export function parseEntries(text: string): Entry[] {
  const data: unknown = JSON.parse(text.replace(/^﻿/, ''))

  if (!Array.isArray(data)) {
    throw new Error('expected a JSON list')
  }

  return data.flatMap(row => {
    const { text: t, gloss, verb } = (row ?? {}) as Record<string, unknown>

    if (typeof t !== 'string' || typeof gloss !== 'string' || t === '') {
      return []
    }

    return [typeof verb === 'string' && verb !== '' ? { text: t, gloss, verb } : { text: t, gloss }]
  })
}

/** What the store held under `packs`, keeping only well-formed entries, names in lower case. */
function cleanPacks(value: unknown): Packs {
  const out: Packs = {}

  if (typeof value !== 'object' || value === null) {
    return out
  }

  for (const [name, spec] of Object.entries(value)) {
    const { argv, cwd, file } = (spec ?? {}) as Record<string, unknown>
    const key = name.toLowerCase()

    if (typeof file === 'string' && file !== '') {
      out[key] = { file }
    } else if (Array.isArray(argv) && argv.length > 0 && argv.every(a => typeof a === 'string')) {
      out[key] = typeof cwd === 'string' && cwd !== '' ? { argv: argv as string[], cwd } : { argv: argv as string[] }
    }
  }

  return out
}

/**
 * Hands out the groups in a shuffled order, every group once before any repeats, and never
 * the same group twice in a row, even where one round ends and the next begins.
 */
export function createDeck(groups: readonly string[], random: () => number = Math.random) {
  let bag: string[] = []
  let last: string | undefined

  return {
    next(): string | undefined {
      if (groups.length === 0) {
        return undefined
      }

      if (bag.length === 0) {
        bag = [...groups]

        for (let i = bag.length - 1; i > 0; i -= 1) {
          const j = Math.floor(random() * (i + 1))
          ;[bag[i], bag[j]] = [bag[j] as string, bag[i] as string]
        }

        // The next draw comes off the end: keep it from repeating the last one drawn.
        if (bag.length > 1 && bag[bag.length - 1] === last) {
          ;[bag[0], bag[bag.length - 1]] = [bag[bag.length - 1] as string, bag[0] as string]
        }
      }

      last = bag.pop()

      return last
    },
  }
}

const groupOf = (entry: Entry) => entry.verb ?? entry.text

const HINT =
  'on | off | alternate | same-line | interval N | rotate N | pack NAME | packs | show NAME | test NAME | refresh | ' +
  'add NAME CMD… [--cwd DIR] | add NAME --file PATH | remove NAME'

export type Change =
  | { field: string; value: string | number | boolean; say: string }
  | { show: true }
  | { pack: string }
  | { packs: true }
  | { describe: string }
  | { test: string }
  | { refresh: true }
  | { add: { name: string; spec: PackSpec } }
  | { remove: string }
  | { error: string }

/** Words and "quoted phrases" of a command line, the quotes dropped; no escapes, so paths keep their backslashes. */
export function tokenize(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|(\S+)/g)].map(m => m[1] ?? m[2] ?? '')
}

/** `/spinner add NAME …`: a JSON file, or a command with an optional `--cwd DIR` right after the name or at the end. */
function parseAdd(rest: string): Change {
  const usage = { error: '/spinner add takes a name and a command or file: /spinner add NAME CMD… [--cwd DIR]  or  /spinner add NAME --file PATH' }
  const [rawName = '', ...tokens] = tokenize(rest)
  const name = rawName.toLowerCase()

  if (!NAME.test(name) || tokens.length === 0) {
    return usage
  }

  if (tokens[0] === '--file') {
    return tokens.length === 2 && tokens[1] ? { add: { name, spec: { file: tokens[1] } } } : usage
  }

  let cwd: string | undefined
  let argv = tokens

  if (tokens[0] === '--cwd') {
    cwd = tokens[1]
    argv = tokens.slice(2)
  } else if (tokens.length >= 2 && tokens[tokens.length - 2] === '--cwd') {
    cwd = tokens[tokens.length - 1]
    argv = tokens.slice(0, -2)
  } else if (tokens[tokens.length - 1] === '--cwd') {
    return usage
  }

  if (argv.length === 0 || cwd === '') {
    return usage
  }

  return { add: { name, spec: cwd ? { argv, cwd } : { argv } } }
}

const WHOLE = /^\d+$/

/** What a `/spinner` argument line asks for: a setting to change, a pack to run, or an error. */
export function parseCommand(args: string): Change {
  const [, rawWord = '', rest = ''] = args.trim().match(/^(\S+)\s*(.*)$/) ?? []
  const word = rawWord.toLowerCase()
  const name = rest.trim().toLowerCase()

  switch (word) {
    case '':
      return { show: true }
    case 'on':
    case 'off':
      return { field: 'enabled', value: word === 'on', say: `Language spinner ${word}.` }
    case 'alternate':
    case 'same-line':
      return { field: 'display', value: word, say: `Display is now ${word}.` }
    case 'interval':
    case 'rotate': {
      const min = word === 'interval' ? 1 : 0
      const n = WHOLE.test(rest.trim()) ? Number(rest.trim()) : NaN

      if (!Number.isFinite(n) || n < min) {
        return { error: `/spinner ${word} takes a whole number of seconds, ${min} or more.` }
      }

      return word === 'interval'
        ? { field: 'intervalSeconds', value: n, say: `Alternate interval is now ${n}s.` }
        : { field: 'rotateSeconds', value: n, say: n === 0 ? 'One phrase per turn.' : `New phrase every ${n}s.` }
    }
    case 'pack':
      return NAME.test(name) ? { pack: name } : { error: '/spinner pack takes a pack name (see /spinner packs).' }
    case 'packs':
      return { packs: true }
    case 'show':
      return NAME.test(name) ? { describe: name } : { error: '/spinner show takes a pack name (see /spinner packs).' }
    case 'test':
      return NAME.test(name) ? { test: name } : { error: '/spinner test takes a pack name (see /spinner packs).' }
    case 'refresh':
      return { refresh: true }
    case 'remove':
      return NAME.test(name) ? { remove: name } : { error: '/spinner remove takes a pack name (see /spinner packs).' }
    case 'add':
      return parseAdd(rest)
    case 'help':
      return { error: `Try: ${HINT}` }
    default:
      return { error: `Unknown option "${rawWord}". Try: ${HINT}` }
  }
}

const seconds = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback

/**
 * Seconds before a new phrase. In alternate display a phrase needs a full round (phrase, then
 * translation) before it moves on, or the translation would never show.
 */
export function effectiveRotate(rotate: number, interval: number, isAlternate: boolean): number {
  return isAlternate && rotate > 0 ? Math.max(rotate, interval * 2) : rotate
}

const why = (error: unknown) => (error instanceof Error ? error.message : String(error))

const describeSpec = (spec: PackSpec) =>
  'file' in spec ? `file ${spec.file}` : `command ${spec.argv.join(' ')}${spec.cwd ? ` (in ${spec.cwd})` : ''}`

async function readPacks($: EngineInterface): Promise<Packs> {
  return cleanPacks(await $.store.get('packs'))
}

/** Why a command failed, in words a person can act on. */
export function explainExit(argv: string[], exitCode: number | null, stdout: string, stderr: string): string {
  const program = argv[0] ?? ''

  // 9009: cmd.exe's "not recognized"; 127: a POSIX shell's "command not found".
  if (exitCode === 9009 || exitCode === 127) {
    return `"${program}" was not found. Check the name, or use the full path` +
      (/^python3?$/.test(program) ? ' (on Windows try "py", elsewhere "python3").' : '.')
  }

  if (exitCode === null) {
    return 'it was stopped before it finished'
  }

  const last = (stderr.trim() || stdout.trim()).split('\n').pop()?.trim()

  return `it exited with ${exitCode}${last ? `: ${last}` : ' and printed nothing'}`
}

/** Runs a pack and returns its list; throws with the reason when it can't. */
export async function runPack($: EngineInterface, name: string): Promise<Entry[]> {
  const builtin = BUILTINS[name]

  if (builtin !== undefined) {
    return builtin()
  }

  const spec = (await readPacks($))[name]

  if (spec === undefined) {
    throw new Error(`there is no pack named "${name}"`)
  }

  let output: string

  if ('file' in spec) {
    try {
      output = (await $.fs.read(spec.file)) as string
    } catch (error) {
      throw new Error(`could not read ${spec.file} (${why(error)})`)
    }
  } else {
    let result
    try {
      result = await $.process.run(spec.argv, {
        timeoutMs: PACK_TIMEOUT_MS,
        env: { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
        ...(spec.cwd ? { cwd: spec.cwd } : {}),
      })
    } catch (error) {
      const reason = why(error)

      throw new Error(/ENOENT|not found|cannot find/i.test(reason)
        ? explainExit(spec.argv, 127, '', '')
        : `could not run it (${reason})`)
    }

    if (result.exitCode !== 0) {
      throw new Error(explainExit(spec.argv, result.exitCode, result.stdout ?? '', result.stderr ?? ''))
    }

    output = result.stdout
  }

  let list
  try {
    list = parseEntries(output)
  } catch (error) {
    throw new Error(`its output is not a list of phrases (${why(error)})`)
  }

  if (list.length === 0) {
    throw new Error('it printed no phrases')
  }

  return list
}

/** Puts entry `index` on screen, phrase first. */
async function showEntry($: EngineInterface, index: number): Promise<void> {
  await update($, view, () => ({ index, phase: 0 as const }))
}

/** Runs a pack and hands its list to `apply` (a user pack's list is also cached); the reason it failed, or null. */
async function refreshPack($: EngineInterface, name: string, apply: (list: Entry[]) => number): Promise<string | null> {
  try {
    const list = await runPack($, name)
    await showEntry($, apply(list))

    if (BUILTINS[name] === undefined) {
      await $.store.set(`cache:${name}`, list)
    }

    return null
  } catch (error) {
    return why(error)
  }
}

export const register: Register = (on, options) => {
  const isEnabled = options.enabled !== false
  // One language at a time unless asked for both on one line.
  const isAlternate = options.display !== 'same-line'
  const interval = Math.max(1, seconds(options.intervalSeconds, 5))
  const askedRotate = seconds(options.rotateSeconds, 20)
  const rotate = effectiveRotate(askedRotate, interval, isAlternate)
  const separator = typeof options.separator === 'string' ? options.separator : ' · '
  const packName = typeof options.pack === 'string' && options.pack.trim() !== ''
    ? options.pack.trim().toLowerCase()
    : DEFAULT_PACK

  let entries: Entry[] = []
  let byGroup = new Map<string, number[]>()
  let deck = createDeck([])
  let stop: (() => void) | null = null

  // Whenever the entries change: regroup them by word and deal a fresh deck of words.
  const load = (next: Entry[]) => {
    entries = next
    byGroup = new Map()
    entries.forEach((entry, index) => byGroup.set(groupOf(entry), [...(byGroup.get(groupOf(entry)) ?? []), index]))
    deck = createDeck([...byGroup.keys()])
  }

  // The next word from the deck, as one of its forms picked at random.
  const draw = (): number => {
    const forms = byGroup.get(deck.next() ?? '') ?? []

    return forms[Math.floor(Math.random() * forms.length)] ?? 0
  }

  // Load a new list and pick its first word, so no session opens on the same one.
  const loadAndDraw = (list: Entry[]): number => {
    load(list)

    return draw()
  }

  load(BUILTINS[packName]?.() ?? [])

  on('command.run', { command: 'spinner' }, async ($, e) => {
    const change = parseCommand(e.args ?? '')

    if ('error' in change) {
      return { text: change.error }
    }

    if ('show' in change) {
      const spec = (await readPacks($))[packName]
      const rows = (await $.config.list()).filter(row => row.key.startsWith('language-spinner.'))
      const settings = rows.map(row => `${row.key.slice('language-spinner.'.length)}: ${String(row.value)}`)
      const lines = [
        `${isEnabled ? 'On' : 'Off'} · pack "${packName}" (${BUILTINS[packName] ? 'built-in' : spec ? describeSpec(spec) : 'missing'}): ` +
          `${byGroup.size} words, ${entries.length} phrases`,
        ...settings,
      ]

      if (rotate !== askedRotate) {
        lines.push(`Note: in alternate display a phrase stays ${rotate}s (two intervals) so its translation shows.`)
      }

      return { text: lines.join('\n') }
    }

    if ('packs' in change) {
      const packs = await readPacks($)
      const names = [...Object.keys(BUILTINS), ...Object.keys(packs).filter(n => BUILTINS[n] === undefined)]

      return {
        text: names.map(n => `${n === packName ? '*' : ' '} ${n}${BUILTINS[n] ? ' (built-in)' : ''}`).join('\n'),
      }
    }

    if ('describe' in change) {
      const name = change.describe

      if (BUILTINS[name] !== undefined) {
        return { text: `"${name}" is built in (hooks/packs/${name}.ts).` }
      }

      const spec = (await readPacks($))[name]

      return { text: spec ? `"${name}": ${describeSpec(spec)}` : `There is no pack named "${name}".` }
    }

    if ('test' in change) {
      try {
        const list = await runPack($, change.test)
        const words = new Set(list.map(groupOf)).size
        const sample = list.slice(0, 5).map(it => `  ${it.text}${separator}${it.gloss}`)

        return { text: [`Pack "${change.test}" works: ${words} words, ${list.length} phrases. First ones:`, ...sample].join('\n') }
      } catch (error) {
        return { text: `Pack "${change.test}" failed: ${why(error)}` }
      }
    }

    if ('refresh' in change) {
      const failure = await refreshPack($, packName, loadAndDraw)

      return {
        text: failure === null
          ? `Refreshed "${packName}": ${byGroup.size} words, ${entries.length} phrases.`
          : `Pack "${packName}" failed: ${failure}`,
      }
    }

    if ('add' in change) {
      const { name, spec } = change.add

      if (BUILTINS[name] !== undefined) {
        return { text: `"${name}" is a built-in pack; pick another name.` }
      }

      const packs = await readPacks($)
      const replaced = packs[name] !== undefined
      await $.store.set('packs', { ...packs, [name]: spec })
      await $.store.delete(`cache:${name}`)

      const next = name === packName
        ? `Run /spinner refresh to use it now.`
        : `Try it with /spinner test ${name}, then switch with /spinner pack ${name}.`

      return { text: `${replaced ? 'Replaced' : 'Added'} pack "${name}". ${next}` }
    }

    if ('remove' in change) {
      const packs = await readPacks($)
      const name = change.remove

      if (BUILTINS[name] !== undefined) {
        return { text: `"${name}" is a built-in pack and can't be removed.` }
      }

      if (packs[name] === undefined) {
        return { text: `There is no pack named "${name}".` }
      }

      if (name === packName) {
        return { text: `"${name}" is the current pack; switch to another first.` }
      }

      const { [name]: _gone, ...kept } = packs
      await $.store.set('packs', kept)
      await $.store.delete(`cache:${name}`)

      return { text: `Removed pack "${name}".` }
    }

    if ('pack' in change) {
      const name = change.pack

      if (BUILTINS[name] === undefined && (await readPacks($))[name] === undefined) {
        return { text: `There is no pack named "${name}". Add one with /spinner add, or see /spinner packs.` }
      }

      const done = await $.config.set({ key: 'language-spinner.pack', value: name })

      return { text: 'deny' in done ? `Could not switch pack: ${String(done.deny)}` : `Switched to "${name}".` }
    }

    const done = await $.config.set({ key: `language-spinner.${change.field}`, value: change.value })

    if ('deny' in done) {
      return { text: `Could not change that setting: ${String(done.deny)}` }
    }

    const willAlternate = change.field === 'display' ? change.value === 'alternate' : isAlternate
    const willInterval = change.field === 'intervalSeconds' ? Number(change.value) : interval
    const willRotate = change.field === 'rotateSeconds' ? Number(change.value) : askedRotate
    const real = effectiveRotate(willRotate, willInterval, willAlternate)

    return {
      text: real !== willRotate
        ? `${change.say} In alternate display each phrase stays ${real}s so its translation shows.`
        : change.say,
    }
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'spinner',
      description: 'Change the language spinner: on/off, display, timing, packs',
      argumentHint: HINT,
    })

    if (!isEnabled) {
      return next(e)
    }

    // A user pack shows its last good list at once; the pack then runs in the background,
    // so a slow or broken one never delays the session. Built-ins need neither.
    if (BUILTINS[packName] === undefined) {
      try {
        const cached = await $.store.get(`cache:${packName}`)

        if (Array.isArray(cached)) {
          load(parseEntries(JSON.stringify(cached)))
        }
      } catch {}
    }

    await showEntry($, draw()).catch(() => undefined)
    const started = await next(e)

    if (BUILTINS[packName] === undefined) {
      void (async () => {
        const failure = await refreshPack($, packName, loadAndDraw)

        if (failure !== null) {
          $.ui.toast(`language-spinner: pack "${packName}" failed: ${failure}`)

          if (entries.length === 0) {
            await showEntry($, loadAndDraw(PAIRS[DEFAULT_PACK]?.() ?? japanese())).catch(() => undefined)
          }
        }
      })()
    }

    return started
  })

  on('prompt.submit', async ($, e, next) => {
    stop?.()
    stop = null

    if (!isEnabled || entries.length === 0) {
      return next(e)
    }

    // Each turn opens on a different word from the last one shown.
    let shown: View = { index: draw(), phase: 0 }
    await update($, view, () => shown)

    if (isAlternate || rotate > 0) {
      let elapsed = 0
      let switchedAt = 0
      const timer = $.clock.every(1000, () => {
        elapsed += 1
        let now = shown

        if (rotate > 0 && elapsed - switchedAt >= rotate) {
          // A different word, not another form of this one, shown from its phrase first.
          switchedAt = elapsed
          now = { index: draw(), phase: 0 }
        } else if (isAlternate) {
          const phase = Math.floor((elapsed - switchedAt) / interval) % 2 === 1 ? 1 : 0
          now = phase === shown.phase ? shown : { ...shown, phase }
        }

        // Write only when what is drawn changes, so the spinner redraws no more than it must.
        if (now !== shown) {
          shown = now
          void update($, view, () => now)
        }
      })
      stop = () => timer.cancel()
    }

    return next(e)
  }).catch((_$, e, next) => next(e))

  on('turn.complete', ($, e, next) => {
    stop?.()
    stop = null

    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    // A message is the engine saying something specific; leave it alone.
    if (!isEnabled || entries.length === 0 || e.props.message !== null) {
      return next(e)
    }

    let word: string
    try {
      const { index, phase } = await read($, view)
      const entry = entries[index] ?? entries[0]

      if (entry === undefined) {
        return next(e)
      }

      word = isAlternate ? (phase === 1 ? entry.gloss : entry.text) : `${entry.text}${separator}${entry.gloss}`
    } catch {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word, suffix: ' …' } })
  })
}
