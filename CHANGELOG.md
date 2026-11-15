# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.5.1] - 2026-11-15

### Fixed
- Every phrase now starts with a capital letter. Spanish, French and German phrases and the English "Let's" began in lower case; only English phrases starting with "I'm" looked right.

## [0.5.0] - 2026-11-15

### Added
- Nine language-pair packs; English-Spanish with alternate display is the default.

## [0.4.0] - 2026-11-15

### Changed
- **The repository and marketplace are now `claude-language-spinner`.** GitHub redirects the old URL. The installed plugin id changes from `language-spinner@language-spinner` to `language-spinner@claude-language-spinner`. To switch, uninstall the old one, install with the commands in the README, and add your packs again.

### Added
- File packs: `/spinner add NAME --file PATH` reads a JSON list, with no script needed. Starter packs for Spanish and French are in `examples/`, along with example script packs in Python and Node.
- `/spinner test NAME` tries a pack without switching to it. `/spinner show NAME` shows what a pack runs or reads.
- `/spinner on` / `off`, and an `enabled` setting.
- Each session opens on a random word instead of always the first one.
- Clearer failure notices: a missing command (exit 9009 or 127) suggests `py` or `python3`; an empty stderr falls back to stdout or says "printed nothing"; a stopped command says so.
- CI, icon, CHANGELOG, `.gitattributes`, an issue template and a README GIF.

### Fixed
- Alternate display with a short `rotate` (for example `rotate 5`, `interval 5`) never showed the translation. A word now stays at least two intervals in alternate display, and `/spinner` says so.
- `rotate` and `interval` accepted values such as `0.5` or `0x10`. They now take whole seconds only.
- `add` over an existing pack silently kept its old cached list, and `remove` left the cache behind. Both now clear it, and `add` says "Replaced".
- Pack names are no longer case-sensitive (`add Japanese` can't shadow the built-in pack).
- `--cwd` is only taken right after the name or at the end, so a `--cwd` meant for your own script is passed through to it.
- Built-in packs no longer re-run on every session start.
- Errors while drawing the spinner fall back to Claude Code's own spinner instead of failing the render.
- Japanese: the ている forms of verbs of arriving or changing state (いく, くる, かえる, おきる) are translated as the resulting state ("I've gone (I'm there)", "I'm awake"), not as an action in progress. Only verbs listed as irregular conjugate as する verbs, so こする is conjugated correctly.
- Tests moved from `hooks/` to `tests/`, so they no longer ship with the plugin.

## [0.3.0] - 2026-11-12
### Changed
- Packs are commands whose output is the list (`/spinner add NAME CMD…`), replacing the `wordFile` setting.

## [0.2.0] - 2026-11-12
### Added
- Alternate display, rotation timer, `/spinner` command.

## [0.1.0] - 2026-11-12
### Added
- First release: Japanese phrases with translations in the thinking spinner.

[0.4.0]: https://github.com/lucaslobasso/claude-language-spinner/compare/f45cf31...language-spinner--v0.4.0
