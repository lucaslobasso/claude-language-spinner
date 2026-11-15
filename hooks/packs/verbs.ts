/**
 * 50 everyday verbs, each as what you say while doing it, in the first person:
 * "I'm eating", "estoy comiendo", "je suis en train de manger", "ich esse gerade", "たべています".
 *
 * French and German have no continuous tense, so they use the usual stand-ins
 * ("être en train de" and "gerade"). Japanese is in hiragana.
 *
 * A row is [key, English, Spanish, French, German, Japanese], each written so the full phrase
 * can be built from it (see `phrases`):
 *   English   after "I'm"
 *   Spanish   after "estoy"
 *   French    the infinitive, after "je suis en train de"
 *   German    after "ich" (the word order is German's, so separable verbs end with their particle)
 *   Japanese  the て-form, before います
 */
type Row = [key: string, en: string, es: string, fr: string, de: string, jp: string]

const ROWS: Row[] = [
  ['eat', 'eating', 'comiendo', 'manger', 'esse gerade', 'たべて'],
  ['drink', 'drinking', 'bebiendo', 'boire', 'trinke gerade', 'のんで'],
  ['sleep', 'sleeping', 'durmiendo', 'dormir', 'schlafe gerade', 'ねて'],
  ['watch', 'watching', 'mirando', 'regarder', 'schaue gerade', 'みて'],
  ['read', 'reading', 'leyendo', 'lire', 'lese gerade', 'よんで'],
  ['write', 'writing', 'escribiendo', 'écrire', 'schreibe gerade', 'かいて'],
  ['listen', 'listening', 'escuchando', 'écouter', 'höre gerade zu', 'きいて'],
  ['talk', 'talking', 'hablando', 'parler', 'spreche gerade', 'はなして'],
  ['walk', 'walking', 'caminando', 'marcher', 'gehe gerade zu Fuß', 'あるいて'],
  ['run', 'running', 'corriendo', 'courir', 'renne gerade', 'はしって'],
  ['swim', 'swimming', 'nadando', 'nager', 'schwimme gerade', 'およいで'],
  ['work', 'working', 'trabajando', 'travailler', 'arbeite gerade', 'はたらいて'],
  ['study', 'studying', 'estudiando', 'étudier', 'studiere gerade', 'べんきょうして'],
  ['play', 'playing', 'jugando', 'jouer', 'spiele gerade', 'あそんで'],
  ['cook', 'cooking', 'cocinando', 'cuisiner', 'koche gerade', 'りょうりして'],
  ['buy', 'buying', 'comprando', 'acheter', 'kaufe gerade', 'かって'],
  ['wait', 'waiting', 'esperando', 'attendre', 'warte gerade', 'まって'],
  ['think', 'thinking', 'pensando', 'penser', 'denke gerade nach', 'かんがえて'],
  ['sing', 'singing', 'cantando', 'chanter', 'singe gerade', 'うたって'],
  ['dance', 'dancing', 'bailando', 'danser', 'tanze gerade', 'おどって'],
  ['drive', 'driving', 'manejando', 'conduire', 'fahre gerade Auto', 'うんてんして'],
  ['clean', 'cleaning', 'limpiando', 'nettoyer', 'putze gerade', 'そうじして'],
  ['wash', 'washing', 'lavando', 'laver', 'wasche gerade', 'あらって'],
  ['open', 'opening', 'abriendo', 'ouvrir', 'öffne gerade', 'あけて'],
  ['close', 'closing', 'cerrando', 'fermer', 'schließe gerade', 'しめて'],
  ['give', 'giving', 'dando', 'donner', 'gebe gerade', 'あげて'],
  ['photo', 'taking a photo', 'sacando una foto', 'prendre une photo', 'mache gerade ein Foto', 'しゃしんをとって'],
  ['make', 'making', 'haciendo', 'faire', 'mache gerade', 'つくって'],
  ['help', 'helping', 'ayudando', 'aider', 'helfe gerade', 'てつだって'],
  ['ask', 'asking', 'preguntando', 'demander', 'frage gerade', 'たずねて'],
  ['answer', 'answering', 'respondiendo', 'répondre', 'antworte gerade', 'こたえて'],
  ['teach', 'teaching', 'enseñando', 'enseigner', 'unterrichte gerade', 'おしえて'],
  ['call', 'calling', 'llamando', 'appeler', 'rufe gerade an', 'でんわをかけて'],
  ['laugh', 'laughing', 'riendo', 'rire', 'lache gerade', 'わらって'],
  ['cry', 'crying', 'llorando', 'pleurer', 'weine gerade', 'ないて'],
  ['travel', 'traveling', 'viajando', 'voyager', 'reise gerade', 'りょこうして'],
  ['look for', 'looking for', 'buscando', 'chercher', 'suche gerade', 'さがして'],
  ['learn', 'learning', 'aprendiendo', 'apprendre', 'lerne gerade', 'ならって'],
  ['sell', 'selling', 'vendiendo', 'vendre', 'verkaufe gerade', 'うって'],
  ['pay', 'paying', 'pagando', 'payer', 'bezahle gerade', 'はらって'],
  ['carry', 'carrying', 'llevando', 'porter', 'trage gerade', 'はこんで'],
  ['climb', 'climbing', 'subiendo', 'grimper', 'klettere gerade', 'のぼって'],
  ['draw', 'drawing', 'dibujando', 'dessiner', 'zeichne gerade', 'えをかいて'],
  ['rest', 'resting', 'descansando', 'se reposer', 'ruhe mich gerade aus', 'やすんで'],
  ['build', 'building', 'construyendo', 'construire', 'baue gerade', 'たてて'],
  ['send', 'sending', 'enviando', 'envoyer', 'schicke gerade', 'おくって'],
  ['fix', 'fixing', 'arreglando', 'réparer', 'repariere gerade', 'なおして'],
  ['choose', 'choosing', 'eligiendo', 'choisir', 'wähle gerade', 'えらんで'],
  ['throw', 'throwing', 'lanzando', 'lancer', 'werfe gerade', 'なげて'],
  ['count', 'counting', 'contando', 'compter', 'zähle gerade', 'かぞえて'],
]

export type Lang = 'en' | 'es' | 'fr' | 'de' | 'jp'

// "d'" before a vowel or a mute h, "de " before anything else; "se reposer" becomes "me reposer".
const french = (infinitive: string) => {
  const verb = infinitive.replace(/^se /, 'me ')

  return /^[aeiouhéèêâî]/i.test(verb) ? `je suis en train d'${verb}` : `je suis en train de ${verb}`
}

const BUILD: Record<Lang, (row: Row) => string> = {
  en: row => `I'm ${row[1]}`,
  es: row => `estoy ${row[2]}`,
  fr: row => french(row[3]),
  de: row => `ich ${row[4]}`,
  jp: row => `${row[5]}います`,
}

/** The verb's phrase in one language, e.g. `phrases('es')[0]` is "estoy comiendo". */
export function phrases(lang: Lang): { verb: string; phrase: string }[] {
  return ROWS.map(row => ({ verb: row[0], phrase: BUILD[lang](row) }))
}
