import type { Entry } from '../../types'

type Group = 'godan' | 'ichidan' | 'irregular'
/** A change-of-state verb's ている means the resulting state, not an action going on: [now, before]. */
type State = [now: string, before: string]
type Verb = [reading: string, group: Group, gloss: string, state?: State]

// Common verbs in hiragana. Add a row to grow the pack: [dictionary form, group, English].
// Verbs of arriving or changing state (いく, くる, かえる, おきる) add what their ている
// form really means: いっている is "has gone, is there", not "is going".
const CORE: Verb[] = [
  ['たべる', 'ichidan', 'eat'], ['のむ', 'godan', 'drink'], ['みる', 'ichidan', 'watch'],
  ['ねる', 'ichidan', 'sleep'], ['おきる', 'ichidan', 'wake up', ["I'm awake", 'I was awake']],
  ['いく', 'godan', 'go', ["I've gone (I'm there)", 'I had gone']],
  ['かえる', 'godan', 'go home', ["I'm back home", 'I was back home']], ['かく', 'godan', 'write'], ['よむ', 'godan', 'read'],
  ['きく', 'godan', 'listen'], ['かう', 'godan', 'buy'], ['あう', 'godan', 'meet'],
  ['まつ', 'godan', 'wait'], ['はなす', 'godan', 'talk'], ['およぐ', 'godan', 'swim'],
  ['あそぶ', 'godan', 'play'], ['はたらく', 'godan', 'work'], ['あるく', 'godan', 'walk'],
  ['べんきょうする', 'irregular', 'study'], ['する', 'irregular', 'do'],
  ['くる', 'irregular', 'come', ["I'm here (I've come)", 'I had come']],
]

// States: "I'm being" reads wrong, so these skip the progressive forms (for verbs added to CORE).
const NO_PROGRESSIVE = new Set(['ある', 'いる', 'わかる', 'できる'])

// Dictionary ending -> its a, i, e, o stems.
const ROWS: Record<string, string> = {
  う: 'わいえお', く: 'かきけこ', ぐ: 'がぎげご', す: 'さしせそ', つ: 'たちてと',
  ぬ: 'なにねの', ぶ: 'ばびべぼ', む: 'まみめも', る: 'らりれろ',
}
const TE: Record<string, string> = {
  う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して',
}

type Forms = { te: string; vol: string; tai: string; pot: string }

/** The te, volitional, -tai and potential forms of a verb, or null when it isn't handled. */
export function forms(reading: string, group: Group): Forms | null {
  // Only a verb listed as irregular is a する verb: こする (rub) is an ordinary godan verb.
  if (group === 'irregular' && reading.endsWith('する')) {
    const p = reading.slice(0, -2)

    return { te: `${p}して`, vol: `${p}しよう`, tai: `${p}したい`, pot: `${p}できる` }
  }

  if (group === 'irregular' && reading.endsWith('くる')) {
    const p = reading.slice(0, -2)

    return { te: `${p}きて`, vol: `${p}こよう`, tai: `${p}きたい`, pot: `${p}こられる` }
  }

  const stem = reading.slice(0, -1)
  const end = reading.slice(-1)

  if (group === 'ichidan' && end === 'る') {
    return { te: `${stem}て`, vol: `${stem}よう`, tai: `${stem}たい`, pot: `${stem}られる` }
  }

  const row = ROWS[end]

  if (group !== 'godan' || row === undefined) {
    return null
  }

  // いく is the one godan verb whose te-form breaks the く -> いて rule.
  const te = reading === 'いく' ? `${stem}って` : `${stem}${TE[end]}`

  return { te, vol: `${stem}${row[3]}う`, tai: `${stem}${row[1]}たい`, pot: `${stem}${row[2]}る` }
}

const ING: Record<string, string> = {
  get: 'getting', put: 'putting', run: 'running', swim: 'swimming', sit: 'sitting',
  stop: 'stopping', cut: 'cutting', begin: 'beginning', forget: 'forgetting', plan: 'planning',
  shop: 'shopping', drop: 'dropping', jog: 'jogging', be: 'being', see: 'seeing',
  die: 'dying', lie: 'lying', tie: 'tying', hit: 'hitting', set: 'setting', chat: 'chatting',
}

function ing(word: string): string {
  if (ING[word] !== undefined) {
    return ING[word]
  }

  if (word.endsWith('e') && !/(ee|ye|oe)$/.test(word)) {
    return `${word.slice(0, -1)}ing`
  }

  return `${word}ing`
}

/** The spinner entries for one verb, English in the first person. */
export function conjugate(reading: string, group: Group, gloss: string, state?: State): Entry[] {
  const f = forms(reading, group)

  if (f === null) {
    return []
  }

  const [head = '', ...rest] = gloss.split(' ')
  const doing = [ing(head), ...rest].join(' ')
  const verb = reading
  const out: Entry[] = []

  if (!NO_PROGRESSIVE.has(reading)) {
    out.push({ text: `${f.te}いる`, gloss: state?.[0] ?? `I'm ${doing}`, verb })
    out.push({ text: `${f.te}いました`, gloss: state?.[1] ?? `I was ${doing}`, verb })
  }

  out.push({ text: f.vol, gloss: `let's ${gloss}`, verb })
  out.push({ text: f.tai, gloss: `I want to ${gloss}`, verb })
  out.push({ text: f.pot, gloss: `I can ${gloss}`, verb })

  return out
}

/** The Japanese starter pack: every CORE verb in five forms. */
export function japanese(): Entry[] {
  return CORE.flatMap(([reading, group, gloss, state]) => conjugate(reading, group, gloss, state))
}
