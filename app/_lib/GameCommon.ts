
export interface SubRow {
    len: number;
    checked: boolean;
}

export interface GameRow {
    subRows: SubRow[];
}

export type Move = {
    row: number;
    subRow: number;
    startBox: number;
    endBox: number;
}

function mkSubRow(len: number, checked?: boolean): SubRow {
    return {
        len: len,
        checked: !!checked
    }
}

export function mkRows(num: number): GameRow[] {
    const r: GameRow[] = [];
    for (let i = 0; i < num; ++i) {
        r.push({
            subRows: [mkSubRow(i + 1)]
        })
    }

    return r;
}

function validateMove(rows: GameRow[], move: Move) {
    if (move.row < 0) throw new Error('row=' + move.row);
    if (move.row >= rows.length) throw new Error('row=' + move.row + '>=' + rows.length + '=rows.length');
    const row = rows[move.row];
    if (move.subRow < 0) throw new Error('subRow=' + move.subRow);
    if (move.subRow >= row.subRows.length) throw new Error('subRow=' + move.subRow + '>=' + row.subRows.length + '=rows[row].subRows.length');
    const subRow = row.subRows[move.subRow];
    if (subRow.checked) throw new Error('subrow already checked');
    const minBox = Math.min(move.startBox, move.endBox);
    const maxBox = Math.max(move.startBox, move.endBox);
    if (minBox < 0) throw new Error('minBox=' + minBox)
    if (maxBox >= subRow.len) throw new Error('maxBox=' + maxBox + '>=' + subRow.len + '=rows[row].subRows[subRow].len');
}

export function processMove(rows: GameRow[], move: Move): GameRow[] {
    validateMove(rows, move);
    const minBox = Math.min(move.startBox, move.endBox);
    const maxBox = Math.max(move.startBox, move.endBox);
    const right = rows[move.row].subRows[move.subRow].len - maxBox - 1;
     return rows.map((row, rowIdx) => rowIdx === move.row ? ({
        subRows: [
            ...row.subRows.filter((_, i) => i < move.subRow),
            ...(
                minBox > 0 ? [mkSubRow(minBox, false)] : []
            ),
            mkSubRow(maxBox - minBox + 1, true),
            ...(
                right > 0 ? [mkSubRow(right, false)] : []
            ),
            ...row.subRows.filter((_, i) => i > move.subRow)
        ]
    }) : row)
}

export function containsUncheckedSubRow(rows: GameRow[]): boolean {
    for (let i = 0; i < rows.length; ++i) {
        const row = rows[i];
        for (let j = 0; j < row.subRows.length; ++j) {
            const subRow = row.subRows[j];
            if (!subRow.checked) return true;
        }
    }

    return false;
}


export interface HighScoreEntry {
    numRows: number;
    durationMs: number;
    name: string;
}
