import { containsUncheckedSubRow, GameRow, mkRows, Move, processMove, SubRow } from "./_lib/GameCommon";

export interface HoveredSubRow {
    row: number;
    subRow: number;
    startBox: number;
}

export const MIN_ROWS = 7;
export const MAX_ROWS = 10;

export type PlayState = {
    type: 'selectRows';
    numRows: number;
} | {
    type: 'selectStarter';
    numRows: number;
    humanStarts: boolean;
} | {
    type: 'computerMove';
    rows: GameRow[];
    humanStarts: boolean;
} | {
    type: 'selectSubRow';
    rows: GameRow[];
    humanStarts: boolean;
    hovered: null | HoveredSubRow;
} | {
    type: 'selectStrikeEnd'
    rows: GameRow[];
    humanStarts: boolean;
    row: number;
    subRow: number;
    startBox: number;
    endBox: number;
} | {
    type: 'confirm'
    rows: GameRow[];
    humanStarts: boolean;
    row: number;
    subRow: number;
    startBox: number;
    endBox: number;
} | {
    type: 'computerWon'
    rows: GameRow[];
    humanStarts: boolean;
} | {
    type: 'humanWon'
    rows: GameRow[];
    humanStarts: boolean;
}

export type State = {
    type: 'highscore'
} | {
    type: 'play';
    play: PlayState;
} | {
    type: 'about'
}

export function selectRows(state: State, rows: number): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectRows':
                    return {
                        ...state,
                        play: {
                            ...state.play,
                            numRows: rows,
                            type: 'selectStarter',
                            humanStarts: true
                        }
                    }
                default:
                    throw new Error('Illegal state.play.type: ' + state.play.type);
            }
            break;
        default:
            throw new Error('Illegal state: ' + state.type);
    }
}

function findComputerMove(s: State): Move {
    // TODO implement the winning strategy
    return {
        row: 0,
        subRow: 0,
        startBox: 0,
        endBox: 0,
    }
}

export function selectStarter(state: State, humanStarts: boolean): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectStarter':
                    return {
                        ...state,
                        play: humanStarts ? {
                            type: 'selectSubRow',
                            rows: mkRows(state.play.numRows),
                            humanStarts: humanStarts,
                            hovered: null,

                        } : {
                            type: 'computerMove',
                            rows: mkRows(state.play.numRows),
                            humanStarts: humanStarts,
                        }
                    }
                default:
                    throw new Error('Illegal state.play.type: ' + state.play.type);
            }
            break;
        default:
            throw new Error('Illegal state.type: ' + state.type);
    }
}

export function selectBox1(state: State, row: number, subRow: number, box: number): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectSubRow':
                    return {
                        ...state,
                        play: {
                            type: 'selectStrikeEnd',
                            rows: state.play.rows,
                            humanStarts: state.play.humanStarts,
                            row: row,
                            subRow: subRow,
                            startBox: box,
                            endBox: box
                        }
                    }
                case 'selectStrikeEnd':
                    if (row === state.play.row && subRow === state.play.subRow) {
                        return {
                            ...state,
                            play: {
                                type: 'confirm',
                                rows: state.play.rows,
                                humanStarts: state.play.humanStarts,
                                row: state.play.row,
                                subRow: state.play.subRow,
                                startBox: state.play.startBox,
                                endBox: box
                            }
                        }
                    }
                    break;
                default:
                // throw new Error('Illegal state.play.type: ' + state.play.type);
            }
            break;
        default:
        // throw new Error('Illegal state.type: ' + state.type);
    }

    return state;

}

export function selectBox(state: State, row: number, subRow: number, box: number): State {
    const res = selectBox1(state, row, subRow, box);
    console.log('result of selectBox(', row, subRow, box, ')', res);
    return res;
}

export function enterBox(state: State, row: number, subRow: number, box: number): State {
    console.log('enterBox state', state, 'row', row, 'subRow', subRow, 'box', box);
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectSubRow':
                    return {
                        ...state,
                        play: {
                            ...state.play,
                            hovered: {
                                row: row,
                                subRow: subRow,
                                startBox: box
                            }
                        }
                    }
                case 'selectStrikeEnd':
                    if (row === state.play.row && subRow === state.play.subRow) {
                        return {
                            ...state,
                            play: {
                                ...state.play,
                                endBox: box
                            }
                        }
                    }
                    break;
            }
    }

    return state;
}

export function leaveBox(state: State, row: number, subRow: number, box: number): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectSubRow':
                    return {
                        ...state,
                        play: {
                            ...state.play,
                            hovered: null
                        }
                    }
                case 'selectStrikeEnd':
                    return {
                        ...state,
                        play: {
                            ...state.play,
                            endBox: state.play.startBox
                        }
                    }
            }
    }

    return state;
}

export function confirmMove(state: State): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'confirm':
                // no break
                case 'selectStrikeEnd':
                    const move: Move = {
                        row: state.play.row,
                        subRow: state.play.subRow,
                        startBox: state.play.startBox,
                        endBox: state.play.endBox
                    }
                    const newRows = processMove(state.play.rows, move);
                    if (containsUncheckedSubRow(newRows)) {
                        return ({
                            type: 'play',
                            play: {
                                type: 'computerMove',
                                rows: newRows,
                                humanStarts: state.play.humanStarts,
                            }
                        })
                    } else {
                        return ({
                            type: 'play',
                            play: {
                                type: 'computerWon',
                                rows: newRows,
                                humanStarts: state.play.humanStarts
                            }
                        })
                    }
            }
    }

    return state;
}

export function undoMove(state: State): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'selectStrikeEnd':
                // no break
                case 'confirm':
                    return {
                        ...state,
                        play: {
                            humanStarts: state.play.humanStarts,
                            rows: state.play.rows,
                            type: 'selectSubRow',
                            hovered: null,
                        }
                    }
            }
    }

    return state;
}

export function processComputerMove(state: State, move: Move): State {
    switch (state.type) {
        case 'play':
            switch (state.play.type) {
                case 'computerMove':
                    return {
                        ...state,
                        play: {
                            ...state.play,
                            rows: processMove(state.play.rows, move),
                            type: 'selectSubRow',
                            hovered: null
                        }
                    }
            }
    }

    return state;
}