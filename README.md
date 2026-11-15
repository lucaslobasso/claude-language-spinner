# claude-language-spinner

[![CI](https://github.com/lucaslobasso/claude-language-spinner/actions/workflows/ci.yml/badge.svg)](https://github.com/lucaslobasso/claude-language-spinner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code mod](https://img.shields.io/badge/Claude%20Code-mod-d97757.svg)](#install)

Learn a language while Claude thinks. Claude Code's "thinking" spinner shows a phrase in the language you're learning, with its translation, and moves on to a different word while a long turn runs.

<p align="center">
  <img src="docs/spinner.gif" alt="Animation: while Claude thinks, the spinner cycles through Japanese phrases with translations: いこう · let's go, していました · I was doing, ねられる · I can sleep, およげる · I can swim" width="680">
</p>
<p align="center"><sub>Real Claude Code output, recorded with <code>rotate 2</code> to make the GIF short. The default is a new word every 20 seconds.</sub></p>

**[Install](#install) · [Commands](#commands) · [Your own pack](#your-own-pack) · [Troubleshooting](#troubleshooting) · [Uninstall](#uninstall)**

The phrases come from a **pack**:

- **Built in:** Japanese (21 common verbs in five forms each).
- **A JSON file:** a list of phrases you write or download. Starter packs for [Spanish](examples/spanish.json) and [French](examples/french.json) are in `examples/`.
- **A script:** any command that prints the list. It can read your study notes, pick the words you got wrong, or call an API.

## Install

**Requirements:** Claude Code with the function-hook plugin API (2.1.3xx or newer; check with `claude --version`). That API is in early access and may change between releases. Script packs need whatever runs the script (Python, Node, ...); the plugin itself needs nothing else.

At the prompt of a Claude Code session:

```
/plugin install language-spinner --marketplace lucaslobasso/claude-language-spinner
```

Answer `y` to add the marketplace, then pick a scope (**user** = every project). Or from a shell:

```
claude plugin install language-spinner --marketplace lucaslobasso/claude-language-spinner
```

The next time Claude thinks, the spinner shows Japanese. To learn something else, see [Your own pack](#your-own-pack).

### Update

```
claude plugin marketplace update claude-language-spinner
claude plugin update language-spinner@claude-language-spinner
```

Third-party marketplaces don't update automatically unless you turn that on in `/plugin` → **Marketplaces**.

## Commands

Everything is controlled from the prompt with `/spinner`. The settings are also rows in `/config`.

| Command | Does |
| --- | --- |
| `/spinner` | Show whether it's on, the current pack and the settings |
| `/spinner on` · `/spinner off` | Turn the phrases on or off (off = Claude Code's own spinner words) |
| `/spinner packs` | List packs (`*` marks the current one) |
| `/spinner pack NAME` | Switch to a pack |
| `/spinner add NAME --file PATH` | Add a pack from a JSON file |
| `/spinner add NAME CMD… [--cwd DIR]` | Add a pack that runs a command |
| `/spinner show NAME` | Show what a pack runs or reads |
| `/spinner test NAME` | Try a pack without switching to it: prints its size and first phrases, or why it failed |
| `/spinner refresh` | Load the current pack again (after you edit the file or your data changes) |
| `/spinner remove NAME` | Remove a pack you added |
| `/spinner same-line` · `/spinner alternate` | Phrase and translation together · or the phrase first, then its translation |
| `/spinner interval 5` | Seconds each half stays up when alternating (whole seconds, 1 or more) |
| `/spinner rotate 20` | Switch to a different word after 20 seconds (`0` = one word per turn) |

Defaults: on, Japanese, same-line, a 5-second interval, a new word every 20 seconds. In alternate display a word always stays for at least two intervals, so its translation gets its turn.

The spinner always moves to a different word, never to another form of the same one. Every word comes up once before any repeats, and a new turn or session never opens on the word the last one ended on.

## Your own pack

A pack is a JSON list of phrases:

```json
[
  { "text": "estoy comiendo", "gloss": "I'm eating", "verb": "comer" },
  { "text": "quiero comer",   "gloss": "I want to eat", "verb": "comer" },
  { "text": "estoy durmiendo", "gloss": "I'm sleeping", "verb": "dormir" }
]
```

- `text`: the phrase in your language. `gloss`: its translation.
- `verb` (optional): rows that share it are forms of one word, so the spinner never jumps between them. Rows without `verb` each count as their own word.
- Rows missing `text` or `gloss` are ignored. Save or print it as UTF-8.

### From a file

The easiest way. Download [examples/spanish.json](examples/spanish.json) (or write your own), then:

```
/spinner add spanish --file C:\packs\spanish.json
/spinner test spanish
/spinner pack spanish
```

Use the **full path** to the file: a relative one is looked up from wherever you started Claude Code.

### From a script

Any command that prints the list works, in any language. See [examples/pack.py](examples/pack.py) and [examples/pack.mjs](examples/pack.mjs).

```
/spinner add spanish py C:\packs\pack.py              (Windows: "py" is the Python launcher)
/spinner add spanish python3 ~/packs/pack.py          (macOS, Linux)
/spinner add spanish node C:\packs\pack.mjs           (Node, which npm installs of Claude Code already have)
```

- Use `--cwd DIR` (right after the name, or at the end) to run the command from a folder, for example a repository your script reads.
- Put quotes around a path with spaces.
- On Windows, `python3` is often a Microsoft Store shortcut that prints nothing, and `python` may not be on your `PATH`. `py` is the safest choice.
- PowerShell and `cmd` scripts don't print UTF-8 by default, so non-English text can come out garbled. Prefer Python or Node, or set the output encoding to UTF-8 in your script.

When Claude Code starts, the current pack's command runs in the background. Its last good list shows straight away, so a slow script never holds anything up. If a command fails, times out (15 seconds) or prints nothing usable, you get one notice saying why, and the last good list stays. If there is none yet, the built-in Japanese pack is used. Run `/spinner refresh` after your data changes.

## The Japanese pack

Common verbs in hiragana, each in five forms: progressive (ている), past progressive, let's (volitional), want to (たい) and can (potential). For verbs of arriving or changing state, the ている form means the resulting state, and the translation says so: いっている is "I've gone (I'm there)", not "I'm going". The verb list and conjugation rules are in [`hooks/packs/japanese.ts`](hooks/packs/japanese.ts).

## Troubleshooting

- **Still Claude's own words.** Run `/spinner` to check that it's on and see how many phrases the pack has. The spinner only changes while Claude is working, and an engine message such as "Compacting" is always left as it is.
- **"pack … failed: "py" was not found".** The command isn't on your `PATH` as seen by Claude Code. Use the full path to the interpreter, or try `py` / `python3` / `node`.
- **"its output is not a list of phrases".** Run your script in a terminal: it must print only the JSON list, nothing before or after it.
- **The same words every time.** That's the pack's last good list (the cache). Run `/spinner refresh`, or `/spinner test NAME` to see the current error.
- **Garbled accents or CJK.** The script printed in another encoding; see the notes under [From a script](#from-a-script).

## Uninstall

```
claude plugin uninstall language-spinner@claude-language-spinner
claude plugin marketplace remove claude-language-spinner
```

## Contributing

```
git clone https://github.com/lucaslobasso/claude-language-spinner
cd claude-language-spinner
claude --plugin-dir .            # try your changes in a session
claude plugin test .             # tests (tests/*.test.tsx)
claude plugin validate .
```

**A new built-in pack** is a TypeScript module in `hooks/packs/` that exports a function returning the list (`{ text, gloss, verb? }[]`), registered by name in `BUILTINS` in `hooks/register.tsx`. See `japanese.ts` for one that conjugates verbs. Pull requests are welcome, especially from native speakers.

The GIF is real output, recorded offscreen with `docs/capture.py` (pseudo-terminal + pyte + PIL; `pip install pyte pillow pywinpty`).

## License

[MIT](LICENSE). This is a community project, not affiliated with Anthropic.
