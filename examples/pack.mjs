// A script pack in Node: prints the phrase list as JSON. Node is already there if you
// installed Claude Code with npm. Edit WORDS, then:
//   /spinner add spanish node /full/path/to/pack.mjs
//   /spinner test spanish
//   /spinner pack spanish
const WORDS = [
  ['comer', 'comiendo', 'eat', 'eating'],
  ['dormir', 'durmiendo', 'sleep', 'sleeping'],
  ['hablar', 'hablando', 'talk', 'talking'],
  ['leer', 'leyendo', 'read', 'reading'],
]

const rows = WORDS.flatMap(([verb, ing, en, enIng]) => [
  { text: `estoy ${ing}`, gloss: `I'm ${enIng}`, verb },
  { text: `quiero ${verb}`, gloss: `I want to ${en}`, verb },
  { text: `puedo ${verb}`, gloss: `I can ${en}`, verb },
])

console.log(JSON.stringify(rows))
