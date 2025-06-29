import csv

# Lire tous les mots et leur fréquence
with open('data3.csv', newline='', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    mots = []
    for row in reader:
        if not any(row):
            continue
        freq = row[2] if len(row) > 2 else ''
        try:
            fval = float(freq.replace(',', '.'))
        except (ValueError, AttributeError):
            fval = 0.0
        mots.append((row, fval))

# Trier par fréquence décroissante
mots.sort(key=lambda x: -x[1])

total = len(mots)
par_niveau = total // 10
reste = total % 10

rows = [header + ['Niveau']]

idx = 0
for niveau in range(1, 11):
    count = par_niveau + (1 if niveau <= reste else 0)
    for _ in range(count):
        if idx >= total:
            break
        row, _ = mots[idx]
        row = row + [str(niveau)]
        rows.append(row)
        idx += 1

with open('data3_niveaux.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerows(rows) 