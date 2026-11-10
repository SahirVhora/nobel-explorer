"""Import one award year from the official Nobel Prize API without changing history.

Usage: python3 scripts/update-laureates.py 2026
"""
import html
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
YEAR = int(sys.argv[1])
SOURCE = 'https://api.nobelprize.org/v1/laureate.json'
if len(sys.argv) > 2:
    laureates = json.loads(Path(sys.argv[2]).read_text())['laureates']
else:
    request = Request(SOURCE, headers={'User-Agent': 'NobelExplorer/1.0'})
    with urlopen(request, timeout=60) as response:
        laureates = json.load(response)['laureates']
path = ROOT / 'nobel_data.js'
text = path.read_text()
start, end = text.index('['), text.index('];', text.index('['))
existing = json.loads(text[start:end + 1])
keys = {(int(row['id']), row['year'], row['category']) for row in existing}
additions = []
for person in laureates:
    for prize in person.get('prizes', []):
        if int(prize['year']) != YEAR:
            continue
        key = (int(person['id']), YEAR, prize['category'])
        if key in keys:
            continue
        row = {field: html.unescape(person.get(field, '')) for field in (
            'firstname', 'surname', 'born', 'died', 'bornCountry',
            'bornCountryCode', 'bornCity', 'diedCountry', 'diedCountryCode',
            'diedCity', 'gender')}
        row.update(id=key[0], year=YEAR, category=prize['category'],
                   overallMotivation=prize.get('overallMotivation', ''),
                   share=int(prize['share']), motivation=html.unescape(prize.get('motivation', '')))
        affiliations = [a for a in prize.get('affiliations', []) if isinstance(a, dict) and a]
        for field in ('name', 'city', 'country'):
            row[field] = '; '.join(html.unescape(a[field]) for a in affiliations if a.get(field))
        row['wiki_url'] = 'https://en.wikipedia.org/wiki/' + (row['firstname'] + ' ' + row['surname']).strip().replace(' ', '_')
        additions.append(row)
        keys.add(key)
if additions:
    # Keep the historical bytes intact, including their ordering and formatting.
    encoded = json.dumps(additions, ensure_ascii=False, indent=2)[1:-2]
    text = text[:end].rstrip() + ',' + encoded + '\n' + text[end:]
    prize_start = text.index('[', text.index('const PRIZES'))
    prize_end = text.index('];', prize_start)
    prizes = json.loads(text[prize_start:prize_end + 1])
    prize_keys = {(p['id'], p['year'], p['category']) for p in prizes}
    fields = ('year', 'category', 'overallMotivation', 'id', 'firstname', 'surname', 'motivation', 'share')
    new_prizes = [{field: row[field] for field in fields} for row in additions
                  if (row['id'], row['year'], row['category']) not in prize_keys]
    if new_prizes:
        encoded_prizes = json.dumps(new_prizes, ensure_ascii=False, indent=2)[1:-2]
        text = text[:prize_end].rstrip() + ',' + encoded_prizes + '\n' + text[prize_end:]
    path.write_text(text)
print(f'Added {len(additions)} award records for {YEAR} from {SOURCE}')
