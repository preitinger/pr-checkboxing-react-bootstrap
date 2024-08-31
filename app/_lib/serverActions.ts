'use server'

import { Db, ObjectId } from "mongodb";
import { containsUncheckedSubRow, GameRow, HighScoreEntry, mkRows, Move, processMove } from "./GameCommon";
import clientPromise from "./mongodb"
import assert from "assert";

interface GameEnd {
    time: number;
    winner: 'human' | 'computer';
}

interface GameDoc {
    /**
     * start time of the game in ms since the epoch.
     */
    start: number;
    rows: GameRow[];
    humanStarts: boolean;
    moves: Move[];
    end: null | GameEnd;
    lastModification: Date;
}

type HighScoreDoc = HighScoreEntry;

function xorSum(rows: GameRow[]): number {
    let x = 0;

    for (const row of rows) {
        for (const subRow of row.subRows) {
            if (!subRow.checked) x ^= subRow.len;
        }
    }

    return x;
}

function findAllMoves(rows: GameRow[]): Move[] {
    const allMoves: Move[] = [];

    for (let row = 0; row < rows.length; ++row) {
        const r = rows[row];
        for (let subRow = 0; subRow < r.subRows.length; ++subRow) {
            const sr = r.subRows[subRow];
            if (sr.checked) continue;
            for (let start = 0; start < sr.len; ++start) {
                for (let end = start; end < sr.len; ++end) {
                    allMoves.push({
                        row,
                        subRow,
                        startBox: start,
                        endBox: end
                    })
                }
            }
        }
    }

    return allMoves;
}

function randomItem<T>(a: T[]): T {
    if (a.length === 0) throw new Error('array empty!');
    const i = Math.floor(Math.random() * a.length);
    assert(i >= 0 && i < a.length);
    return a[i]
}

function atLeast2SubRowsGt1(rows: GameRow[]): boolean {
    let found = false;

    for (const row of rows) {
        for (const subRow of row.subRows) {
            if (subRow.checked) continue;
            if (subRow.len > 1) {
                if (!found) {
                    found = true;
                } else {
                    return true;
                }
            }
        }
    }

    return false;
}

function findComputerMove(rows: GameRow[]): Move {
    const allMoves = findAllMoves(rows);
    const specialCase = !atLeast2SubRowsGt1(rows);
    const sum = xorSum(rows) ^ (specialCase ? 1 : 0);
    const winningMoves: Move[] = [];

    for (const move of allMoves) {
        const subRow = rows[move.row].subRows[move.subRow];
        const old = subRow.len;
        const minBox = Math.min(move.startBox, move.endBox);
        const maxBox = Math.max(move.startBox, move.endBox);
        const left = minBox;
        const right = subRow.len - 1 - maxBox
        const newSum = sum ^ old ^ left ^ right;
        if (newSum === 0) winningMoves.push(move);
    }

    if (winningMoves.length > 0) {
        return randomItem(winningMoves);
    } else if (allMoves.length > 0) {
        return randomItem(allMoves);
    }

    throw new Error('Game over');
}

export async function gameStart(numRows: number, humanStarts: boolean): Promise<[string, Move | null]> {
    const client = await clientPromise;
    const db = client.db('pr-checkboxing-react-bootstrap');

    let rows = mkRows(numRows);
    const computerMove = humanStarts ? null : findComputerMove(rows);

    if (computerMove != null) {
        rows = processMove(rows, computerMove);
    }

    const col = db.collection<GameDoc>('games');
    const res = await col.insertOne({
        start: Date.now(),
        rows: rows,
        humanStarts: humanStarts,
        moves: computerMove == null ? [] : [computerMove],
        end: null,
        lastModification: new Date(),
    })

    if (!res.acknowledged) throw new Error('insertion of GameDoc was not acknowledged');
    return [res.insertedId.toJSON(), computerMove];
}

/**
 * 
 * @param id 
 * @param move 
 * @returns next computer move if game is not over, otherwise null
 */
export async function humanMove(id: string, move: Move): Promise<Move | null> {
    const now = Date.now();
    const client = await clientPromise;
    const db = client.db('pr-checkboxing-react-bootstrap');
    const col = db.collection<GameDoc>('games');
    const objectId = new ObjectId(id);
    const doc = await col.findOne({
        _id: objectId
    }, {
        projection: {
            start: 1,
            rows: 1,
        }
    })
    if (doc == null) throw new Error('Game not found');
    const rowsAfterHumanMove = processMove(doc.rows, move);
    if (containsUncheckedSubRow(rowsAfterHumanMove)) {
        const computerMove = findComputerMove(rowsAfterHumanMove);
        const rowsAfterComputerMove = processMove(rowsAfterHumanMove, computerMove);
        const end: null | GameEnd = containsUncheckedSubRow(rowsAfterComputerMove) ? null
            : {
                time: now,
                winner: 'human'
            }
        const updateRes = await col.updateOne({
            _id: objectId
        }, {
            $set: {
                rows: rowsAfterComputerMove,
                end: end,
                lastModification: new Date(),
            },
            $push: {
                moves: { $each: [move, computerMove] }
            }
        })
        if (!updateRes.acknowledged) throw new Error('update not acknowledged');
        if (updateRes.modifiedCount !== 1) throw new Error('game not found');
        return computerMove
    } else {
        const updateRes = await col.updateOne({
            _id: objectId
        }, {
            $set: {
                rows: rowsAfterHumanMove,
                end: {
                    time: now,
                    winner: 'computer'
                },
                lastModification: new Date(),
            },
            $push: {
                moves: move
            }
        })
        if (!updateRes.acknowledged) throw new Error('update not acknowledged');
        if (updateRes.modifiedCount !== 1) throw new Error('game not found');

        return null;
    }
}

export async function highScoreEntry(gameId: string, name: string) {
    if (name.length > 32) name = name.substring(0, 32);
    const client = await clientPromise;
    const db = client.db('pr-checkboxing-react-bootstrap');
    const col = db.collection<GameDoc>('games');
    const objectId = new ObjectId(gameId);
    const doc = await col.findOneAndDelete({
        _id: objectId
    }, {
        projection: {
            start: 1,
            end: 1,
            rows: 1,
        }
    })
    if (doc == null) throw new Error('Game not found');
    if (doc.end?.winner !== 'human') throw new Error('The game has not (yet) been won by the human.');

    const hsCol = db.collection<HighScoreDoc>('highScore');
    const hsRes = await hsCol.insertOne({
        numRows: doc.rows.length,
        durationMs: doc.end.time - doc.start,
        name,
    })
    if (!hsRes.acknowledged) throw new Error('Insertion of high score entry not acknowledged.');

}

export async function getHighScore(): Promise<HighScoreEntry[]> {
    const client = await clientPromise;
    const db = client.db('pr-checkboxing-react-bootstrap');
    const hsCol = db.collection<HighScoreDoc>('highScore');
    const cursor = hsCol.find({}).sort({ durationMs: 1 }).sort({ numRows: -1 }).limit(100);
    const hs = await cursor.toArray();
    return hs.map(e => ({
        numRows: e.numRows,
        durationMs: e.durationMs,
        name: e.name
    }));

}