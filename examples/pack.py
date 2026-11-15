"""A script pack in Python: prints the phrase list as JSON. Edit WORDS, then:

    /spinner add spanish py C:\\path\\to\\pack.py         (Windows: the "py" launcher)
    /spinner add spanish python3 /path/to/pack.py       (macOS, Linux)
    /spinner test spanish
    /spinner pack spanish

A script can do anything: read your study notes, pick the words you got wrong, call an API.
"""
import json

WORDS = [
    ("comer", "comiendo", "eat", "eating"),
    ("dormir", "durmiendo", "sleep", "sleeping"),
    ("hablar", "hablando", "talk", "talking"),
    ("leer", "leyendo", "read", "reading"),
]

rows = []
for verb, ing, en, en_ing in WORDS:
    rows += [
        {"text": f"estoy {ing}", "gloss": f"I'm {en_ing}", "verb": verb},
        {"text": f"quiero {verb}", "gloss": f"I want to {en}", "verb": verb},
        {"text": f"puedo {verb}", "gloss": f"I can {en}", "verb": verb},
    ]

# ensure_ascii=False keeps accents readable; the spinner reads UTF-8.
print(json.dumps(rows, ensure_ascii=False))
