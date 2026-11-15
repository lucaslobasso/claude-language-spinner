# claude-language-spinner

Claude Code mod: the thinking spinner shows a phrase in a target language plus translation. Plugin name
`language-spinner`, marketplace `claude-language-spinner` (this repo, renamed from `language-spinner` in 0.4.0), so the
installed id is `language-spinner@claude-language-spinner`.

- Code: `hooks/register.tsx` (commands, packs, timers, render), `hooks/packs/japanese.ts` (built-in conjugation).
- Engine rule: `$` may only be passed to functions declared at the top level of the file, never to closures inside
  `register` (the module fails to load otherwise).
- Try changes: `claude --plugin-dir .`, with a marketplace copy disabled (two spinners fight).
- Check: `claude plugin test .` and `claude plugin validate .`. Tests live in `tests/` so they don't ship.
- GIF: `docs/capture.py` (offscreen PTY + pyte + PIL), see the README Contributing section.
- Release: bump `version` in `.claude-plugin/plugin.json` and both versions in `marketplace.json`, CHANGELOG entry,
  merge, then `claude plugin tag . --push` (tags `language-spinner--vX.Y.Z`).
