'use server'

import { ObjectId } from "mongodb";
import { containsUncheckedSubRow, GameRow, mkRows, Move, processMove } from "./GameCommon";
import clientPromise from "./mongodb"

interface GameDoc {
    rows: GameRow[];
    humanStarts: boolean;
    moves: Move[];
}

function findComputerMove(rows: GameRow[]): Move {
    console.error('nyi');

    for (let row = 0; row < rows.length; ++row) {
        const theRow = rows[row];
        for (let subRow = 0; subRow < theRow.subRows.length; ++subRow) {
            const theSubRow = theRow.subRows[subRow];
            if (!theSubRow.checked) return {
                row: row,
                subRow: subRow,
                startBox: 0,
                endBox: theSubRow.len - 1
            }
        }
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
        rows: rows,
        humanStarts: humanStarts,
        moves: computerMove == null ? [] : [computerMove]
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
    const client = await clientPromise;
    const db = client.db('pr-checkboxing-react-bootstrap');
    const col = db.collection<GameDoc>('games');
    const objectId = new ObjectId(id);
    const doc = await col.findOne({
        _id: objectId
    })
    if (doc == null) throw new Error('Game not found');
    console.log('doc', doc);
    const rowsAfterHumanMove = processMove(doc.rows, move);
    if (containsUncheckedSubRow(rowsAfterHumanMove)) {
        const computerMove = findComputerMove(rowsAfterHumanMove);
        const rowsAfterComputerMove = processMove(rowsAfterHumanMove, computerMove);
        const updateRes = await col.updateOne({
            _id: objectId
        }, {
            $set: {
                rows: rowsAfterComputerMove
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
                rows: rowsAfterHumanMove
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