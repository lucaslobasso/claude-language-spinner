import { expect, mock, test } from 'claude-code/testing'

import { conjugate, forms, japanese } from '../hooks/packs/japanese'
import { effectiveRotate, explainExit, parseCommand } from '../hooks/register'

// What 0.4 added or fixed.

const run = ($: any) => async (args: string) =>
  $.command.run({ command: 'spinner', args }).then((r: any) => r.text as string)

const ROWS = [
  { text: 'estoy comiendo', gloss: "I'm eating", verb: 'comer' },
  { text: 'quiero dormir', gloss: 'I want to sleep', verb: 'dormir' },
]

test('a file pack: add with --file, then test reads the file', async ($, on) => {
  mock.store(on, {})
  const read: string[] = []
  on('fs.read', (_, e) => {
    read.push(e.path)

    return { value: JSON.stringify(ROWS) }
  })

  expect(parseCommand('add spanish --file C:\\packs\\spanish.json')).toEqual({
    add: { name: 'spanish', spec: { file: 'C:\\packs\\spanish.json' } },
  })
  expect(await run($)('add spanish --file C:\\packs\\spanish.json')).toContain('/spinner test spanish')
  expect(await run($)('show spanish')).toBe('"spanish": file C:\\packs\\spanish.json')

  const out = await run($)('test spanish')
  // The engine resolves the path before the read; on Linux `C:\…` isn't absolute, so only the end is certain.
  expect(read).toHaveLength(1)
  expect(read[0]).toMatch(/spanish\.json$/)
  expect(out).toContain('works: 2 words, 2 phrases')
  expect(out).toContain("estoy comiendo· I'm eating")
})

test('a file pack that is missing says which file', async ($, on) => {
  mock.store(on, { packs: { spanish: { file: 'nope.json' } } })
  on('fs.read', () => {
    throw new Error('ENOENT')
  })

  expect(await run($)('test spanish')).toMatch(/failed: could not read nope.json/)
})

// A store in memory the test can look into.
const memoryStore = (on: any, start: Record<string, unknown>) => {
  const data = new Map(Object.entries(start))
  on('store.get', (_: any, e: any) => ({ value: data.get(e.key) }))
  on('store.set', (_: any, e: any) => (data.set(e.key, e.value), { value: undefined }))
  on('store.delete', (_: any, e: any) => (data.delete(e.key), { value: undefined }))
  on('store.keys', () => ({ value: [...data.keys()] }))

  return data
}

test('add over an existing pack says it replaced it and drops the old cache', async ($, on) => {
  const data = memoryStore(on, { packs: { study: { argv: ['old'] } }, 'cache:study': ROWS })

  expect(await run($)('add study --cwd C:\\repo py spinner.py')).toMatch(/^Replaced pack "study"/)
  expect(data.has('cache:study')).toBe(false)
  expect(await run($)('show study')).toBe('"study": command py spinner.py (in C:\\repo)')
})

test('remove drops the pack and its cache', async ($, on) => {
  const data = memoryStore(on, { packs: { study: { argv: ['py', 'x.py'] } }, 'cache:study': ROWS })

  expect(await run($)('remove study')).toBe('Removed pack "study".')
  expect(data.has('cache:study')).toBe(false)
  expect(data.get('packs')).toEqual({})
})

test('pack names are not case-sensitive', async ($, on) => {
  mock.store(on, {})

  expect(await run($)('add Japanese py x.py')).toContain('built-in')
  expect(parseCommand('pack STUDY')).toEqual({ pack: 'study' })
  expect(parseCommand('PACKS')).toEqual({ packs: true })
})

test('--cwd can come right after the name or at the end, nowhere else', () => {
  expect(parseCommand('add s --cwd D:\\r py a.py')).toEqual({ add: { name: 's', spec: { argv: ['py', 'a.py'], cwd: 'D:\\r' } } })
  expect(parseCommand('add s py a.py --cwd D:\\r')).toEqual({ add: { name: 's', spec: { argv: ['py', 'a.py'], cwd: 'D:\\r' } } })
  // A --cwd in the middle belongs to the user's own script.
  expect(parseCommand('add s py a.py --cwd x --verbose')).toEqual({
    add: { name: 's', spec: { argv: ['py', 'a.py', '--cwd', 'x', '--verbose'] } },
  })
  expect(parseCommand('add s --file')).toHaveProperty('error')
})

test('timings take whole seconds only', () => {
  for (const bad of ['rotate 0.5', 'rotate 0x10', 'interval 1e1', 'interval 2s']) {
    expect(parseCommand(bad)).toHaveProperty('error')
  }
})

test('in alternate display a phrase stays at least two intervals', () => {
  expect(effectiveRotate(5, 5, true)).toBe(10)
  expect(effectiveRotate(20, 5, true)).toBe(20)
  expect(effectiveRotate(5, 5, false)).toBe(5)
  expect(effectiveRotate(0, 5, true)).toBe(0)
})

test(
  'alternate with a short rotate still shows the translation',
  { options: { display: 'alternate', rotateSeconds: 5, intervalSeconds: 5 } },
  async ($, on) => {
    const clock = mock.clock(on)
    on('prompt.submit', (_, e) => e)
    on('ui.render', ($, e) => {
      const { Text } = $.ui.resolve(e)

      return <Text>{`${e.props.word}`}</Text>
    })

    await $.prompt.submit({ text: 'hi' })
    const ui = await $.ui.mount({
      plugin: 'language-spinner', component: 'Spinner', requestId: 'turn', surface: 'terminal',
      props: { word: 'x', message: null, suffix: '…', mode: 'thinking' },
    } as const)

    await clock.advance(5000)
    expect((await ui.find({ type: 'Text' }))?.text).toMatch(/^(I'm|I was|I've|I had|let's|I want|I can)/)
    await ui.unmount()
  },
)

test('/spinner off and on flip the enabled setting', async ($, on) => {
  const set: unknown[] = []
  on('config.set', (_, e) => {
    set.push({ key: e.key, value: e.value })

    return { value: e.value }
  })

  expect(await run($)('off')).toBe('Language spinner off.')
  expect(await run($)('on')).toBe('Language spinner on.')
  expect(set).toEqual([
    { key: 'language-spinner.enabled', value: false },
    { key: 'language-spinner.enabled', value: true },
  ])
})

test('when off, the engine spinner is left alone', { options: { enabled: false } }, async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{`${e.props.word}`}</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'language-spinner', component: 'Spinner', requestId: 'turn', surface: 'terminal',
    props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
  } as const)

  expect((await ui.find({ type: 'Text' }))?.text).toBe('Sauteing')
  await ui.unmount()
})

test('failures say what to do', () => {
  expect(explainExit(['python3', 'x.py'], 9009, '', '')).toMatch(/"python3" was not found.*try "py"/)
  expect(explainExit(['node', 'x.js'], 127, '', '')).toMatch(/"node" was not found/)
  expect(explainExit(['py', 'x.py'], 1, '', '')).toBe('it exited with 1 and printed nothing')
  expect(explainExit(['py', 'x.py'], 2, 'oops on stdout\n', '')).toBe('it exited with 2: oops on stdout')
  expect(explainExit(['py', 'x.py'], null, '', '')).toBe('it was stopped before it finished')
})

test('only verbs listed as irregular conjugate as する verbs', () => {
  expect(forms('こする', 'godan')?.vol).toBe('こすろう')
  expect(forms('べんきょうする', 'irregular')?.pot).toBe('べんきょうできる')
})

test('change-of-state verbs say what their ている form really means', () => {
  const gloss = (text: string) => japanese().find(it => it.text === text)?.gloss

  expect(gloss('いっている')).toBe("I've gone (I'm there)")
  expect(gloss('きている')).toBe("I'm here (I've come)")
  expect(gloss('かえっている')).toBe("I'm back home")
  expect(gloss('おきている')).toBe("I'm awake")
  expect(gloss('たべている')).toBe("I'm eating")
  expect(conjugate('いく', 'godan', 'go')[0]?.gloss).toBe("I'm going") // no state given: the plain rule
})
