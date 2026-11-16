#!/usr/bin/env python3
"""Regenerates the README screenshots:  python docs/screenshots.py [name ...]

Each shot is a real Claude Code session, offscreen, captured while Claude is thinking. It
uses the capture script shared by the whole set (claude-boxed-messages docs/capture.py,
downloaded at CAPTURE_REF; set CAPTURE_PY to a local copy to skip the download), with your
login in a throwaway config folder, so none of your own settings or plugins show up.
Needs `pip install pyte pillow pywinpty` (ptyprocess instead of pywinpty off Windows).
The GIF (docs/spinner.gif) is made the same way with `--frames`; see the README.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.request

CAPTURE_REF = 'main'
DOCS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(DOCS)
PROMPT = 'Think it through, then write a 150-word story about a lighthouse keeper.'

# file name -> (language-spinner options, seconds after Enter to take the picture)
# A .gif is 9 frames a second apart from one session: the phrase, then its translation.
SHOTS = {
    'alternate.gif': ({'intervalSeconds': 3}, 1.5),
    'same-line.png': ({'display': 'same-line'}, 3),
    'pack-en-jp.png': ({'pack': 'en-jp', 'display': 'same-line'}, 3),
    'pack-fr-de.png': ({'pack': 'fr-de', 'display': 'same-line'}, 3),
    'pack-japanese.png': ({'pack': 'japanese', 'display': 'same-line'}, 3),
}


def capture_script(tmp: str) -> str:
    if os.environ.get('CAPTURE_PY'):
        return os.environ['CAPTURE_PY']
    url = f'https://raw.githubusercontent.com/lucaslobasso/claude-boxed-messages/{CAPTURE_REF}/docs/capture.py'
    path = os.path.join(tmp, 'capture.py')
    urllib.request.urlretrieve(url, path)
    return path


def main() -> int:
    wanted = sys.argv[1:] or list(SHOTS)
    with tempfile.TemporaryDirectory(prefix='spinner-shots-') as work:
        script = capture_script(work)
        for name in wanted:
            options, after = SHOTS[name]
            settings = {'promptSuggestionEnabled': False, 'pluginConfigs': {'language-spinner@inline': {'options': options}}}
            subprocess.run([
                sys.executable, script, '--out', os.path.join(DOCS, name), '--cwd', work,
                '--sandbox', json.dumps(settings), '--wait', str(6 + after), '--cols', '90', '--rows', '20',
                '--from-text', 'Think it through', '--title', 'claude',
                '--send', f'{PROMPT}@5', '--send', '\\r@6',
                *(['--frames', '9', '--every', '1000'] if name.endswith('.gif') else []),
                '--', 'claude', '--plugin-dir', REPO, '--model', 'opus',
            ], check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
