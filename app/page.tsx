'use client'

import Image from "next/image";
import { CSSProperties, useEffect, useRef, useState } from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/ListGroup";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import ImgAttributions from "./_lib/ImgAttributions";
import { myImgAttributions } from "./myImgAttributions";
import { PlayState, State, MIN_ROWS, MAX_ROWS, selectRows, selectStarter, selectBox, HoveredSubRow, enterBox, leaveBox, processComputerMove, confirmMove, undoMove, LastComputerMove } from "./state";
import styles from './page.module.css';
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { gameStart, getHighScore, highScoreEntry, humanMove } from "./_lib/serverActions";
import { GameRow, HighScoreEntry, Move, processMove, SubRow } from "./_lib/GameCommon";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Pagination from "react-bootstrap/Pagination";
import Placeholder from "react-bootstrap/Placeholder";
import Table from "react-bootstrap/Table";
import Rules from "./Rules";

interface HighScoreProps {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
}

const HIGH_SCORE_PAGE_SIZE = 100;

function HighScore({ page, pageSize, setPage }: HighScoreProps) {
  const [entries, setEntries] = useState<null | HighScoreEntry[]>(null);

  useEffect(() => {

    getHighScore(page, pageSize).then(entries1 => setEntries(entries1));

  }, [page, pageSize])

  const detailedMin = Math.max(0, page - 2);
  const detailedMax = page + 2;

  const onPage = (p: number) => () => {
    if (p === page) return;
    setPage(p);
  }

  const pageItemStyle: CSSProperties = { /* width: '6ex', */ textAlign: 'center' };
  function pageItem(p: number, key?: number) {
    return <Pagination.Item key={key} style={pageItemStyle} onClick={onPage(p)}>{p + 1}</Pagination.Item>
  }

  return (
    <>
      {/* <h1 className='mb-3'>High Score</h1> */}
      {/* <h2 className='mb-3'>High Score</h2> */}
      <Row>
        <Col className='d-flex flex-column align-items-center'>
          <div className='position-relative'>
            <h3 style={{ position: 'absolute', top: '0', left: '0', width: '100%', textAlign: 'center' }}>High Score</h3>
            <Image className='' src='/7379644_32301.jpg' alt='Trophy' width={400} height={492} />
          </div>
        </Col>
        <Col>
          <div className='overflow-auto border mb-3' style={{ height: '80vh' }} >
            <Table >
              <tbody>
                <tr>
                  <th>Rank</th><th>Name</th><th>Rows</th><th>Time</th>
                </tr>
                {
                  entries == null ? <tr>
                    <td><Placeholder xs={2} /></td><td><Placeholder xs={5} /></td><td><Placeholder xs={2} /></td><td><Placeholder xs={6} /></td>
                  </tr> :
                    entries.map((e, i) => <tr key={i}>
                      <td>{page * pageSize + i + 1}</td>
                      <td>{e.name}</td>
                      <td>{e.numRows}</td>
                      <td>{e.durationMs / 1000} sec</td>
                    </tr>)}
              </tbody>
            </Table>
          </div>
          <Pagination>
            <Pagination.First style={pageItemStyle} active={page === 0} onClick={onPage(0)} />
            <Pagination.Prev style={pageItemStyle} disabled={page === 0} onClick={page > 0 ? onPage(page - 1) : undefined} />
            {
              detailedMin > 0 && <Pagination.Ellipsis style={pageItemStyle} onClick={onPage(Math.max(0, page - 20))} />
            }

            {
              Array.from({
                length: page - detailedMin
              }).map((_, i) => pageItem(detailedMin + i, i))
            }
            <Pagination.Item style={pageItemStyle} active>{page + 1}</Pagination.Item>
            {
              Array.from({
                length: detailedMax - page
              }).map((_, i) => pageItem(page + 1 + i, i))
            }
            <Pagination.Ellipsis onClick={onPage(page + 20)} />
            <Pagination.Next onClick={onPage(page + 1)} />
          </Pagination>
        </Col>
      </Row >
    </>

  )
}

function SubRowComp({ subRow, hover, emphasize, startBox, endBox, computerSubRow, onClick, onEnter, onLeave }:
  {
    subRow: SubRow;
    hover: boolean;
    emphasize: boolean;
    computerSubRow: boolean;
    startBox?: number;
    endBox?: number;
    onClick: (box: number) => void;
    onEnter: (box: number) => void;
    onLeave: (box: number) => void;
  }) {
  const minBox = startBox != null && endBox != null ? Math.min(startBox, endBox) : undefined;
  const maxBox = startBox != null && endBox != null ? Math.max(startBox, endBox) : undefined;
  console.log('computerSubRow', computerSubRow);
  return (
    <div className={`d-flex justify-content-center ${!subRow.checked && hover ? styles.hover : emphasize ? styles.emphasize : computerSubRow ? styles.lastComputerMove : ''}`}>
      {Array.from({ length: subRow.len }).map((_, i) =>
        <Form.Check key={i} className={`m-2 ${!hover && !emphasize ? styles.forbidden : ''}`} readOnly={true} checked={subRow.checked || (minBox != null && maxBox != null && minBox <= i && maxBox >= i)} onClick={() => onClick(i)} onMouseEnter={() => onEnter(i)} onMouseLeave={() => onLeave(i)}></Form.Check>)
      }
    </div>
  )
}

function RowComp({ row, hover, subRow, startBox, endBox, lastComputerSubRow, onClick, onEnter, onLeave }:
  {
    row: GameRow;
    hover: boolean;
    subRow?: number;
    startBox?: number;
    endBox?: number;
    lastComputerSubRow?: number;
    onClick: (subRow: number, box: number) => void;
    onEnter: (subRow: number, box: number) => void;
    onLeave: (subRow: number, box: number) => void;
  }) {
    console.log('lastComputerSubRow', lastComputerSubRow);
  return (
    <div className='d-flex justify-content-center'>
      {row.subRows.map((subRow1, i) => <SubRowComp key={i} subRow={subRow1} hover={hover} startBox={subRow === i ? startBox : undefined} endBox={subRow === i ? endBox : undefined}
        emphasize={subRow === i} computerSubRow={lastComputerSubRow === i} onClick={(box) => {
          onClick(i, box);
        }} onEnter={(box) => onEnter(i, box)} onLeave={(box) => onLeave(i, box)} />)}
    </div>
  )
}

interface PlayProps {
  playState: PlayState;
  rowsSelected: (rows: number) => void;
  humanStartsSelected: (humanStarts: boolean) => void;
  onClick: (row: number, subRow: number, box: number) => void;
  onEnter: (row: number, subRow: number, box: number) => void;
  onLeave: (row: number, subRow: number, box: number) => void;
  onConfirm: () => void;
  onUndo: () => void;
  onNewGame: () => void;
}

function Play({ playState, rowsSelected, humanStartsSelected, onClick, onEnter, onLeave, onConfirm, onUndo, onNewGame }: PlayProps) {
  const [rulesVisible, setRulesVisible] = useState(false);
  const endImgRef = useRef<HTMLDivElement>(null);

  if (playState == null) throw new Error('playState nullish?!');

  useEffect(() => {
    if ((playState.type === 'humanWon' || playState.type === 'computerWon') && endImgRef.current != null) {
      endImgRef.current.scrollIntoView();
    }
  }, [playState.type]);

  return (
    <>
      {/* <h1 className='mb-3'>Play</h1> */}
      {playState.type === 'selectRows' &&
        <>
          <Form>
            <Form.Label className='mb-1'>Select the number of rows in the game</Form.Label>
            <ListGroup className='mb-3'>
              {[3, ...Array.from({ length: MAX_ROWS - MIN_ROWS + 1 }).map((_, i) => i + MIN_ROWS)].map(rows =>
                <ListGroup.Item style={{ cursor: 'pointer' }} className={styles.pointer} variant='secondary' key={rows} onClick={() => rowsSelected(rows)}>{rows} {rows < 5 && '(No-Brainer)'} {rows === 7 && '(Hard)'} {rows > 7 && '(For math freaks)'}</ListGroup.Item>
              )}
            </ListGroup>
            {/* <Form.Select>
              {Array.from({ length: MAX_ROWS - MIN_ROWS + 1 }).map((_, i) => i + MIN_ROWS).map(rows =>
                <option key={rows} value={rows}>{rows}</option>
              )}
            </Form.Select> */}
          </Form>
        </>
      }
      {
        playState.type === 'selectStarter' &&
        <>
          <Form>
            <p className='mb-3'>Game with {playState.numRows} rows.</p>
            <Form.Label className='mb-1'>Who shall start with the first move?</Form.Label>
            <ListGroup className='mb-3'>
              <ListGroup.Item style={{ cursor: 'pointer' }} onClick={() => humanStartsSelected(true)}>Human shall start.</ListGroup.Item>
              <ListGroup.Item style={{ cursor: 'pointer' }} onClick={() => humanStartsSelected(false)}>Computer shall start.</ListGroup.Item>
            </ListGroup>
          </Form>
        </>
      }
      {
        playState.type === 'computerMove' || playState.type === 'selectSubRow' || playState.type === 'selectStrikeEnd' || playState.type === 'confirm' || playState.type === 'computerWon' || playState.type === 'humanWon' ?
          <>
            <Row className='align-items-center'>
              <Col xs={12} lg={6} className='mb-3 bg-dark rounded' >
                {/* <Image className='d-xs-block d-lg-none' src='/brain.png' alt='Brain' width={105} height={90} />
                <Image className='d-none d-lg-block' src='/brain.png' alt='Brain' width={210} height={180} /> */}

                <Button className='m-3' size='sm' variant={playState.type === 'humanWon' || playState.type === 'computerWon' ? 'primary' : 'secondary'} onClick={onNewGame}>
                  New Game
                </Button>
                <Button className='m-3' size='sm' variant='secondary' onClick={() => setRulesVisible(true)}>Rules</Button>
                {(playState.type === 'confirm' || playState.type === 'selectStrikeEnd') && <>
                  <Button size='sm' variant="primary" className='me-1' onClick={onConfirm}>Confirm</Button>
                  <Button size='sm' variant='secondary' onClick={onUndo}>Undo</Button>
                </>
                }
                <div>
                  {playState.rows.map((row, i) => <RowComp
                    key={i}
                    row={row}
                    hover={playState.type === 'selectSubRow'}
                    subRow={playState.type === 'selectSubRow' && playState.hovered?.row === i ? playState.hovered?.subRow
                      : (playState.type === 'selectStrikeEnd' || playState.type === 'confirm') && playState.row === i ? playState.subRow : undefined}
                    startBox={playState.type === 'selectSubRow' && playState.hovered?.row === i ? playState.hovered?.startBox
                      : (playState.type === 'selectStrikeEnd' || playState.type === 'confirm') && playState.row === i ? playState.startBox : undefined}
                    endBox={playState.type === 'selectSubRow' && playState.hovered?.row === i ? playState.hovered?.startBox
                      : (playState.type === 'selectStrikeEnd' || playState.type === 'confirm') && playState.row === i ? playState.endBox : undefined}
                    lastComputerSubRow={(playState.type === 'humanWon' || playState.type === 'selectSubRow' || playState.type === 'selectStrikeEnd' || playState.type === 'confirm') && playState.lastComputerMove?.row === i ? playState.lastComputerMove.subRow ?? undefined : undefined}
                    onClick={(subRow, box) => onClick(i, subRow, box)}
                    onEnter={(subRow, box) => onEnter(i, subRow, box)}
                    onLeave={(subRow, box) => onLeave(i, subRow, box)}
                  />)}
                </div>
              </Col>
              <Col xs={12} lg={6} className='ms-xs-auto ms-md-0 me-auto mb-3'>
                {
                  (playState.type === 'computerMove' || playState.type === 'selectSubRow' || playState.type === 'selectStrikeEnd' || playState.type === 'confirm') &&
                  <Alert className='mb-3' style={{ height: '5em' }} >
                    {
                      playState.type === 'computerMove' ? 'Computer moving...'
                        : playState.type === 'selectSubRow' ? 'Start your move and click to the start of the range to strike.'
                          : playState.type === 'selectStrikeEnd' ? 'Finish your move and click to the end of the range to strike.'
                            : playState.type === 'confirm' ? 'Confirm or undo your move.' : ''


                    }
                  </Alert>
                }
                {
                  (playState.type === 'confirm' || playState.type === 'selectStrikeEnd') &&
                  <div className='d-flex justify-content-center'>
                    <Button variant="primary" className='me-1' size="lg" onClick={onConfirm}>Confirm</Button>
                    <Button variant='secondary' onClick={onUndo}>Undo</Button>
                  </div>
                }
                {
                  playState.type === 'humanWon' && <div ref={endImgRef} className='mt-4 d-flex flex-column align-items-center'>
                    <h1 style={{ textAlign: 'center' }}>You won!</h1>
                    {/* <Image src='/7379644_32301.jpg' width={400} height={492} alt='You won!' /> */}
                    <Image style={{ maxWidth: '100vw', height: 'auto' }} alt='Champagne' src='/tenor.gif' width={576} height={576} />
                  </div>
                }
                {
                  playState.type === 'computerWon' && <div ref={endImgRef} className='mt-4 d-flex flex-column align-items-center'>
                    <h1 style={{ textAlign: 'center' }}>Computer won!</h1>
                    <Image src='/lost.png' width={357} height={384} alt='Computer won!' />
                  </div>
                }

              </Col>
            </Row>
            <Modal show={rulesVisible} onHide={() => setRulesVisible(false)}>
              <Modal.Header closeButton><h4>Game Rules</h4></Modal.Header>
              <Modal.Body>
                <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
                  <Rules withoutHeader />
                </div>
              </Modal.Body>

            </Modal>
          </> :
          <></>
      }
    </>
  )
}

function About() {
  return (<>
    <h3>About</h3>
    <p>This is a little puzzle game created as a finger exercise to test the UI framework &quot;React Bootstrap&quot;.</p>
    <Rules />
    <ImgAttributions attributions={myImgAttributions} />
  </>)
}

export default function Home() {
  const [state, setState] = useState<State>({ type: 'highscore', page: 0, pageSize: 100 });
  const [enteringHighScore, setEnteringHighScore] = useState(false);
  const [name, setName] = useState('');
  const gameId = useRef<string>('');

  function addHighScoreEntry() {
    setEnteringHighScore(false);
    const id = gameId.current;
    if (id) {
      highScoreEntry(gameId.current, name).then(() => {
      }).catch(reason => {
        console.error(reason);
      })
    }

  }

  function cancelHighScoreEntry() {
    setEnteringHighScore(false);
  }

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      if ('type' in e.state && e.state.type === 'highscore' || e.state.type === 'play') {
        setState(e.state);
      } else {
        setState({ type: 'highscore', page: 0, pageSize: 100 });
      }
    }
    window.addEventListener('popstate', onPopState)

    // history.replaceState({type: 'highscore'}, '')
    return () => {
      window.removeEventListener('popstate', onPopState);
    }
  }, [])

  function onBoxClick(row: number, subRow: number, box: number) {
    setState(d => selectBox(d, row, subRow, box));
  }

  function onBoxEnter(row: number, subRow: number, box: number) {
    setState(d => enterBox(d, row, subRow, box));
  }

  function onBoxLeave(row: number, subRow: number, box: number) {
    setState(d => leaveBox(d, row, subRow, box));
  }

  function onMoveConfirm() {
    if (state.type === 'play' && (state.play.type === 'confirm' || state.play.type === 'selectStrikeEnd')) {
      const move: Move = {
        row: state.play.row,
        subRow: state.play.subRow,
        startBox: state.play.startBox,
        endBox: state.play.endBox
      }
      const stateAfterConfirm = confirmMove(state);
      humanMove(gameId.current, move).then(computerMove => {
        if (computerMove != null) {
          const newState = processComputerMove(stateAfterConfirm, computerMove)
          console.log('newState', newState);
          setState(newState);
          if (newState.type === 'play' && newState.play.type === 'humanWon') {
            setEnteringHighScore(true);
          }
        }
      })

      setState(stateAfterConfirm);
    }
  }

  function onMoveUndo() {
    setState(d => undoMove(d))
  }

  function onNewGame() {
    setState({
      page: state.page,
      pageSize: state.pageSize,
      type: 'play',
      play: {
        type: 'selectRows',
        numRows: 7
      }
    })
  }


  return (
    <>
      <Container>
        <Navbar>
          {/* <Container className='p-0'> */}
          <Navbar.Brand>Checkboxing</Navbar.Brand>
          <Navbar.Collapse>
            <Nav>
              <Nav.Link disabled={state.type === 'highscore'} onClick={() => { const pushedState: State = { type: 'highscore', page: 0, pageSize: 100 }; history.pushState(pushedState, ''); setState(pushedState); }}>High Score</Nav.Link>
              <Nav.Link disabled={state.type === 'play'} onClick={() => {
                const pushedState: State = {
                  page: state.page,
                  pageSize: state.pageSize,
                  type: 'play',
                  play: {
                    type: 'selectRows',
                    numRows: MIN_ROWS,
                  }
                }
                history.pushState(pushedState, '');
                setState(pushedState);
              }}>Play</Nav.Link>
              <Nav.Link disabled={state.type === 'about'} onClick={() => { const pushedState: State = { page: state.page, pageSize: state.pageSize, type: 'about' }; history.pushState(pushedState, ''); setState(pushedState); }}>About</Nav.Link>
            </Nav>
          </Navbar.Collapse>
          {/* </Container> */}
        </Navbar>
        <hr className='mb-5' />
        {state.type === 'highscore' &&
          <HighScore page={state.page} pageSize={state.pageSize} setPage={(p: number) => setState(d => ({ ...d, page: p }))} />
        }
        {state.type === 'play' &&
          <Play
            playState={state.play}
            rowsSelected={(rows) => {
              setState((s) => selectRows(s, rows));
            }}
            humanStartsSelected={(humanStarts) => {
              const newState = selectStarter(state, humanStarts);
              setState(newState);
              if (newState.type === 'play' && (newState.play.type === 'computerMove' || newState.play.type === 'selectSubRow')) {
                gameStart(newState.play.rows.length, newState.play.humanStarts).then(res => {
                  const [id, computerMove] = res;
                  gameId.current = id;

                  if (computerMove != null) {
                    if (newState.play.type != 'computerMove') throw new Error('invalid state');
                    setState(processComputerMove(newState, computerMove))
                  }
                })
              }
            }}
            onClick={onBoxClick}
            onEnter={onBoxEnter}
            onLeave={onBoxLeave}
            onConfirm={onMoveConfirm}
            onUndo={onMoveUndo}
            onNewGame={onNewGame}
          />
        }
        {state.type === 'about' &&
          <About />
        }
        <Modal show={enteringHighScore} onHide={cancelHighScoreEntry}>
          <Modal.Header closeButton>High Score Entry</Modal.Header>
          <Modal.Body>
            <Form.Group className='mb-3'>
              <Form.Label>Name for your high score entry</Form.Label>
              <Form.Control type='text' value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <div className='d-flex flex-col justify-content-end'>
              <Button variant='primary' className='m-1' onClick={addHighScoreEntry}>Add High Score Entry</Button>
              <Button className='m-1' variant='secondary' onClick={cancelHighScoreEntry}>Cancel</Button>
            </div>
          </Modal.Body>
        </Modal>

      </Container>
    </>
  );
}
