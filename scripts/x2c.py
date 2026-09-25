"""Dump one worksheet of an xlsx to UTF-8 CSV. Stdlib only.

    python3 x2c.py book.xlsx out.csv [sheet#]      # sheet# is 1-based, default 1
    python3 x2c.py book.xlsx out.csv 2 --clean     # flatten 2-row header, drop empty cols
    python3 x2c.py book.xlsx list                  # show sheet numbers and names

Merged cells are expanded: the value is written into every cell of the range,
taken from the sheet's own <mergeCells>, not guessed.
"""
import csv, re, sys, zipfile
import xml.etree.ElementTree as ET

M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def cell_ref(ref):
    """'B3' -> (row 2, col 1), both 0-based."""
    col, row = re.match(r'([A-Z]+)(\d+)', ref).groups()
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return int(row) - 1, n - 1


def sheets(z):
    return list(ET.fromstring(z.read('xl/workbook.xml')).find(f'{M}sheets'))


def read_sheet(src, num=1):
    """-> (sheet name, grid of strings with merged ranges expanded)."""
    z = zipfile.ZipFile(src)
    sheet = sheets(z)[num - 1]                      # document order == tab order
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target = next(r.get('Target') for r in rels if r.get('Id') == sheet.get(f'{R}id'))
    ws = ET.fromstring(z.read('xl/' + target.lstrip('/').removeprefix('xl/')))

    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        shared = [''.join(t.text or '' for t in si.iter(f'{M}t'))
                  for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]

    cells, width = {}, 0
    for c in ws.iter(f'{M}c'):
        t, v = c.get('t'), c.find(f'{M}v')
        if t == 's':
            val = shared[int(v.text)] if v is not None else ''
        elif t == 'inlineStr':
            val = ''.join(x.text or '' for x in c.iter(f'{M}t'))
        else:
            val = v.text if v is not None else ''
        rc = cell_ref(c.get('r'))
        width = max(width, rc[1] + 1)
        if val:
            cells[rc] = val

    for m in ws.iter(f'{M}mergeCells'):
        for rng in m:
            (r0, c0), (r1, c1) = map(cell_ref, rng.get('ref').split(':'))
            val = cells.get((r0, c0), '')
            for r in range(r0, r1 + 1):
                for c in range(c0, c1 + 1):
                    if val:
                        cells[(r, c)] = val

    rowmax = max((r for r, _ in cells), default=-1)
    grid = [[cells.get((r, c), '') for c in range(width)] for r in range(rowmax + 1)]
    return sheet.get('name'), grid


def tidy(grid):
    """Flatten the two-row header, drop empty columns, collapse whitespace."""
    grid = [[re.sub(r'\s+', ' ', c).strip() for c in row] for row in grid]
    grid = [row for row in grid if any(row)]
    group, sub, data = grid[0], grid[1], grid[2:]
    # Group labels carry parenthetical notes ("（颜色标记为各项前三）"); not names.
    group = [re.sub(r'[（(][^）)]*[）)]', '', g).strip() for g in group]
    # A header merged down both rows reads the same twice -> one plain name.
    header = [g if g == s else f'{g}_{s}' if g and s else g or s
              for g, s in zip(group, sub)]
    keep = [j for j in range(len(header)) if any(r[j] for r in data)]
    return [[header[j] for j in keep]] + [[r[j] for j in keep] for r in data]


def write(rows, dst):
    width = max(map(len, rows), default=0)
    # BOM so Excel opens it as UTF-8 on double-click instead of guessing GBK.
    with open(dst, 'w', newline='', encoding='utf-8-sig') as f:
        csv.writer(f).writerows(r + [''] * (width - len(r)) for r in rows)
    return len(rows), width


def selftest():
    assert [cell_ref(r) for r in ('A1', 'C7', 'Z1', 'AA1', 'AI2')] == \
           [(0, 0), (6, 2), (0, 25), (0, 26), (1, 34)]

    M_, R_ = M[1:-1], R[1:-1]
    parts = {
        'xl/workbook.xml': f'<workbook xmlns="{M_}" xmlns:r="{R_}"><sheets>'
                           f'<sheet name="s1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006'
            '/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"'
            '/></Relationships>',
        'xl/sharedStrings.xml': f'<sst xmlns="{M_}"><si><t>国</t></si>'
                                f'<si><t>里特司</t></si></sst>',
        # A1:A2 merged down (plain name), B1:C1 merged across (prefix), A3:A4 merged
        # down in the body (fill), D empty throughout (dropped).
        'xl/worksheets/sheet1.xml': f'''<worksheet xmlns="{M_}"><sheetData>
            <row r="1"><c r="A1" t="s"><v>0</v></c>
                       <c r="B1" t="inlineStr"><is><t>成长（注）</t></is></c></row>
            <row r="2"><c r="B2" t="inlineStr"><is><t>HP</t></is></c>
                       <c r="C2" t="inlineStr"><is><t>力量</t></is></c>
                       <c r="D2"/></row>
            <row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><v>60</v></c>
                       <c r="C3"><v>35</v></c></row>
            <row r="4"><c r="B4"><v>55</v></c><c r="C4"><v>30</v></c></row>
            </sheetData><mergeCells count="3"><mergeCell ref="A1:A2"/>
            <mergeCell ref="B1:C1"/><mergeCell ref="A3:A4"/></mergeCells></worksheet>''',
    }
    import tempfile, os
    with tempfile.TemporaryDirectory() as d:
        xlsx, out = os.path.join(d, 'b.xlsx'), os.path.join(d, 'o.csv')
        with zipfile.ZipFile(xlsx, 'w') as z:
            for n, body in parts.items():
                z.writestr(n, body)
        name, grid = read_sheet(xlsx)
        assert name == 's1'
        assert grid[0] == ['国', '成长（注）', '成长（注）', '']   # merge expanded across
        assert grid[3][0] == '里特司'                    # merge expanded down
        assert tidy(grid) == [
            ['国', '成长_HP', '成长_力量'],
            ['里特司', '60', '35'],
            ['里特司', '55', '30'],
        ]
        assert write(tidy(grid), out) == (3, 3)
    print('ok')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--clean']
    if args == ['selftest']:
        selftest()
    elif len(args) == 2 and args[1] == 'list':
        for i, s in enumerate(sheets(zipfile.ZipFile(args[0])), 1):
            print(i, s.get('name'))
    elif len(args) in (2, 3):
        name, grid = read_sheet(args[0], int(args[2]) if len(args) > 2 else 1)
        if '--clean' in sys.argv:
            grid = tidy(grid)
        rows, cols = write(grid, args[1])
        print(f'{name!r} -> {args[1]}  ({rows} rows x {cols} cols)')
    else:
        sys.exit(__doc__)
