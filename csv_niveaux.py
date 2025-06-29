import csv

# Correspondance catégorie -> niveau
mapping = {
    'Très très courant': 1,
    'Très courant': 2,
    'Courant': 3,
    'Moyennement courant': 5,
    'Peu courant': 8
}

def get_niveau(cat):
    cat = cat.strip() if cat else ''
    return mapping.get(cat, 10)

with open('data.csv', newline='', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    header.append('Niveau')
    rows = [header]
    for row in reader:
        # Si la ligne est vide, on saute
        if not any(row):
            continue
        # On récupère la catégorie fréquence (colonne 5 ou -1 si moins de colonnes)
        cat = row[5] if len(row) > 5 else ''
        niveau = get_niveau(cat)
        row = row + [str(niveau)]
        rows.append(row)

with open('data_niveaux.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerows(rows) 