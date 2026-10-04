import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "./lib/config";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { errorMessage } from "./lib/errors";
import { connectedWallet, ensureStudioNet, getOption, requestWallet, sendWrite, waitForVerdict } from "./lib/genlayer";
import { optionId, short } from "./lib/ids";
import { pyLen, pyStrip } from "./lib/pytext";
import {
  electBlock,
  holderLine,
  MAX_COURSE_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_TEXT_LENGTH,
  objectBlock,
  openBlock,
  roleOf,
  withdrawBlock,
} from "./lib/rules";
import type { Option, TxStatus } from "./lib/types";
import { electVerified, objectVerified, openVerified, withdrawVerified } from "./lib/verify";

type Tab = "overview" | "open" | "inspect" | "compare";

const RECENT_KEY = "theircall.recent";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* storage unavailable: the recent list is a convenience only */
  }
}

function cleanId(value: string): string {
  return pyStrip(value).toLowerCase().replace(/^0x/, "");
}

const validId = (v: string) => /^[0-9a-f]{64}$/.test(cleanId(v));

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function Meter({ bytes }: { bytes: number }) {
  return (
    <span className={bytes > CALLDATA_LIMIT ? "meter over" : "meter"} title="GenLayer calldata; the RPC rejects more than 255 bytes">
      {bytes}/{CALLDATA_LIMIT} B
    </span>
  );
}

/** Same sentence, address set in mono on its own line. */
function splitHolder(line: string): [string, string] {
  const i = line.lastIndexOf(" (");
  return i < 0 ? [line, ""] : [line.slice(0, i), line.slice(i + 1)];
}

type CardProps = {
  option: Option;
  me: string;
  busy: boolean;
  onElect: (o: Option, course: string) => Promise<void>;
  onObject: (o: Option, note: string) => Promise<void>;
  onWithdraw: (o: Option) => Promise<void>;
};

function OptionCard({ option: o, me, busy, onElect, onObject, onWithdraw }: CardProps) {
  const [course, setCourse] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState(false);
  const wallet = me || "0x" + "0".repeat(40);
  const noWallet = "Connect a wallet first";
  const electReason = me ? electBlock(o, wallet, course) : noWallet;
  const objectReason = me ? objectBlock(o, wallet, note) : noWallet;
  const withdrawReason = me ? withdrawBlock(o, wallet) : noWallet;
  const role = me ? roleOf(o, me) : null;
  const authorHolds = o.holder === "AUTHOR";
  const isElector = !!me && me.toLowerCase() === o.elector_wallet.toLowerCase();
  const electBytes = calldataBytes("elect", [o.option_id, pyStrip(course)]);
  const noteBytes = calldataBytes("object_to_election", [o.option_id, pyStrip(note)]);

  return (
    <article className={`ticket ${authorHolds ? "t-author" : "t-receiver"}`}>
      <header className="t-band">
        <span className="t-kind">{authorHolds ? "Author holds the choice" : "Receiver holds the choice"}</span>
        <span className={`t-state s-${o.state.toLowerCase()}`}>{o.state}</span>
      </header>
      <div className="t-body">
        <blockquote>{o.text}</blockquote>
        <div className="holder-card">
          <p className="holder-line">{splitHolder(holderLine(o))[0]} <span className="holder-addr">{splitHolder(holderLine(o))[1]}</span></p>
          <p className="holder-sub">elector <code>{o.elector_wallet}</code></p>
          <p className="holder-sub">objector <code>{o.objector_wallet}</code></p>
        </div>
        <dl className="t-facts">
          <div><dt>Reading</dt><dd><code>{o.outcome}</code></dd></div>
          <div><dt>Holder</dt><dd><code>{o.holder}</code></dd></div>
          <div><dt>Author</dt><dd><code>{short(o.author)}</code></dd></div>
          <div><dt>Receiver</dt><dd><code>{short(o.receiver_wallet)}</code> ({o.receiver_label})</dd></div>
        </dl>
        <p className="t-id">option id <code>{o.option_id}</code></p>
        {role && <p className={`you ${isElector ? "you-holds" : "you-not"}`}>Connected wallet: <strong>{role}</strong> · {isElector ? "holds the choice here" : "does not hold the choice here"}</p>}
      </div>

      <div className="perf" aria-hidden="true" />

      {o.state === "ELECTED" && (
        <div className="t-taken">
          <p className="taken-by">elected: “{o.chosen_course}”</p>
          <p className="taker"><span>elected_by</span> <code>{o.elected_by}</code></p>
          <p className={o.elected_by === o.elector_wallet ? "match ok" : "match bad"}>
            {o.elected_by === o.elector_wallet ? "✓ elected_by matches the elector wallet" : "elected_by does not match the elector wallet"}
          </p>
          {o.objection_note && <p className="objection">objection by the other side: “{o.objection_note}”</p>}
        </div>
      )}
      {o.state === "WITHDRAWN" && <div className="t-taken"><p className="taken-by muted">withdrawn by the author before anyone elected</p></div>}

      <div className="t-act">
        <div className="row">
          <input value={course} maxLength={MAX_COURSE_LENGTH * 2} placeholder="Course to elect (one of the two in the text)" onChange={(e) => setCourse(e.target.value)} />
          <button className="accept" disabled={busy || electReason !== null || electBytes > CALLDATA_LIMIT} onClick={async () => { await onElect(o, course); setCourse(""); }}>Elect</button>
        </div>
        <div className="reasons">
          <small>{pyLen(pyStrip(course))}/{MAX_COURSE_LENGTH} · <Meter bytes={electBytes} /></small>
          {electReason && <span className="why">Elect: {electReason}</span>}
        </div>
        <div className="row">
          <input value={note} maxLength={MAX_NOTE_LENGTH * 2} placeholder="Objection note" onChange={(e) => setNote(e.target.value)} />
          <button className="ghost" disabled={busy || objectReason !== null || noteBytes > CALLDATA_LIMIT} onClick={async () => { await onObject(o, note); setNote(""); }}>Object</button>
        </div>
        <div className="reasons">
          <small>{pyLen(pyStrip(note))}/{MAX_NOTE_LENGTH} · <Meter bytes={noteBytes} /></small>
          {objectReason && <span className="why">Object: {objectReason}</span>}
        </div>
        <div className="row withdraw-row">
          <button className="ghost" disabled={busy || withdrawReason !== null} onClick={() => onWithdraw(o)}>Withdraw</button>
          {withdrawReason && <span className="why">Withdraw: {withdrawReason}</span>}
          <button className="ghost history-btn" onClick={() => setHistory((h) => !h)}>{history ? "Hide history" : "History"}</button>
        </div>
        {history && (
          <ol className="history">
            <li>Opened by <code>{o.author}</code> — validators read <code>{o.outcome}</code>, holder <code>{o.holder}</code>.</li>
            {o.state === "ELECTED" && <li>Elected “{o.chosen_course}” by <code>{o.elected_by}</code>.</li>}
            {o.objection_note && <li>Objection by <code>{o.objector_wallet}</code>: “{o.objection_note}”.</li>}
            {o.state === "WITHDRAWN" && <li>Withdrawn by the author.</li>}
            {o.state === "OPEN" && <li>Open — nobody has elected yet.</li>}
          </ol>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [tx, setTx] = useState<TxStatus>({ phase: "idle", message: "" });
  const [pendingHash, setPendingHash] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);

  const [receiver, setReceiver] = useState("");
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [exists, setExists] = useState(false);

  const [idInput, setIdInput] = useState("");
  const [current, setCurrent] = useState<Option | null>(null);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [pair, setPair] = useState<[Option | null, Option | null]>([null, null]);

  const busy = ["checking", "signing", "submitted"].includes(tx.phase) || pendingHash !== "";

  useEffect(() => {
    connectedWallet().then(setMe).catch(() => undefined);
    window.ethereum?.on?.("accountsChanged", (a: string[]) => setMe((a?.[0] ?? "").toLowerCase()));
  }, []);

  const remember = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      saveRecent(next);
      return next;
    });
  }, []);

  const localId = me && pyStrip(text) ? optionId(me, text) : "";

  useEffect(() => {
    let cancelled = false;
    setExists(false);
    if (!localId || !CONTRACT_ADDRESS) return;
    const t = setTimeout(() => {
      getOption(localId).then((o) => !cancelled && setExists(!!o)).catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [localId]);

  const openReason = me ? openBlock({ me, receiverWallet: receiver, label, text, exists }) : "Connect a wallet first";
  const openBytes = calldataBytes("open_option", [pyStrip(receiver) || "0x" + "0".repeat(40), pyStrip(label), pyStrip(text)]);

  async function connect() {
    try {
      const w = await requestWallet();
      await ensureStudioNet();
      setMe(w);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e) });
    }
  }

  /** Reload every card that shows this id; return the fresh copy. */
  async function refresh(id: string): Promise<Option | null> {
    const next = await getOption(id);
    setCurrent((c) => (c && c.option_id === id ? next : c));
    setPair(([a, b]) => [a && a.option_id === id ? next : a, b && b.option_id === id ? next : b]);
    return next;
  }

  async function loadById(raw: string) {
    const id = cleanId(raw);
    if (!validId(id)) {
      setTx({ phase: "error", message: "Enter a 64-character option id." });
      return;
    }
    setTx({ phase: "idle", message: "" });
    setIdInput(id);
    const next = await getOption(id);
    setCurrent(next);
    setTab("inspect");
    if (!next) setTx({ phase: "error", message: "No option with this id on this deployment." });
    else remember(id);
  }

  async function loadPair() {
    const a = cleanId(leftId);
    const b = cleanId(rightId);
    setPair([validId(a) ? await getOption(a) : null, validId(b) ? await getOption(b) : null]);
  }

  /** Receipt first, then the postcondition on reloaded accepted state. */
  async function runWrite(what: string, send: () => Promise<string>, verified: () => Promise<boolean>) {
    let hash = "";
    try {
      setTx({ phase: "signing", message: `${what}: confirm in your wallet…` });
      hash = await send();
      setPendingHash(hash);
      setTx({ phase: "submitted", message: `${what}: submitted, waiting for the leader receipt…`, hash });
      await finish(what, hash, verified);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e), hash: hash || undefined });
      setPendingHash("");
    }
  }

  async function finish(what: string, hash: string, verified: () => Promise<boolean>) {
    const verdict = await waitForVerdict(hash);
    if (verdict.kind === "pending") {
      setTx({ phase: "delayed", message: "Submitted — confirmation delayed. Do not resend; check again in a moment.", hash });
      return;
    }
    if (verdict.kind === "error") {
      setPendingHash("");
      setTx({ phase: "error", message: `${what} reverted: ${verdict.reason}`, hash });
      return;
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await verified()) {
        setPendingHash("");
        setTx({ phase: "success", message: `${what}: executed, and the accepted state shows the change.`, hash });
        return;
      }
      await sleep(3000);
    }
    setPendingHash("");
    setTx({ phase: "error", message: `${what}: the receipt reports success but the accepted state does not show the expected change yet. Reload before acting again.`, hash });
  }

  async function checkAgain() {
    if (!pendingHash) return;
    setTx({ phase: "submitted", message: "Checking the receipt again…", hash: pendingHash });
    await finish("Pending transaction", pendingHash, async () => true);
  }

  async function onOpen() {
    if (!me || !localId) return;
    setTx({ phase: "checking", message: "Checking the accepted state before sending…" });
    const already = !!(await getOption(localId));
    const reason = openBlock({ me, receiverWallet: receiver, label, text, exists: already });
    if (reason) {
      setExists(already);
      setTx({ phase: "error", message: reason });
      return;
    }
    if (openBytes > CALLDATA_LIMIT) {
      setTx({ phase: "error", message: `Calldata is ${openBytes} bytes; the RPC rejects more than ${CALLDATA_LIMIT}. Shorten the text.` });
      return;
    }
    const sub = { me, receiverWallet: pyStrip(receiver).toLowerCase(), label, text, optionId: localId };
    await runWrite(
      "Open option",
      () => sendWrite(me, "open_option", [sub.receiverWallet, pyStrip(label), pyStrip(text)]),
      async () => openVerified(await getOption(sub.optionId), sub),
    );
    remember(sub.optionId);
    setIdInput(sub.optionId);
    setText("");
    setTab("inspect");
    setCurrent(await getOption(sub.optionId));
  }

  async function onElect(o: Option, course: string) {
    const c = pyStrip(course);
    await runWrite("Elect", () => sendWrite(me, "elect", [o.option_id, c]), async () => electVerified(await refresh(o.option_id), me, c));
    await refresh(o.option_id);
  }

  async function onObject(o: Option, note: string) {
    const n = pyStrip(note);
    await runWrite("Object to election", () => sendWrite(me, "object_to_election", [o.option_id, n]), async () => objectVerified(o, await refresh(o.option_id), n));
    await refresh(o.option_id);
  }

  async function onWithdraw(o: Option) {
    await runWrite("Withdraw option", () => sendWrite(me, "withdraw_option", [o.option_id]), async () => withdrawVerified(await refresh(o.option_id)));
    await refresh(o.option_id);
  }

  const WORKSPACE: [Tab, string, string][] = [
    ["overview", "⌂", "Overview"],
    ["open", "+", "Open an option"],
    ["inspect", "◇", "Inspect option"],
    ["compare", "⇆", "Side by side"],
  ];
  const explorer = CONTRACT_ADDRESS ? `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}` : EXPLORER_BASE;
  const TITLES: Record<Tab, string> = {
    overview: "Whose call is it",
    open: "Open an option",
    inspect: "Inspect an option",
    compare: "Two options, one wallet",
  };
  const myRole = current && me ? roleOf(current, me) : null;

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand">
          <img src="/logo-192.png" alt="" width={42} height={42} />
          <div>
            <strong>TheirCall</strong>
            <span>Intelligent Contract dApp</span>
          </div>
        </div>
        <p className="side-head">Workspace</p>
        <nav>
          {WORKSPACE.map(([t, icon, name]) => (
            <button key={t} className={tab === t ? "side-tab on" : "side-tab"} onClick={() => setTab(t)}>
              <i>{icon}</i>{name}
            </button>
          ))}
        </nav>
        <p className="side-head">Verification</p>
        <nav>
          <a className="side-tab" href={explorer} target="_blank" rel="noreferrer"><i>↗</i>Transaction truth</a>
          <button className="side-tab" onClick={() => { setTab("overview"); setTimeout(() => document.getElementById("reviewer-path")?.scrollIntoView({ behavior: "smooth" }), 50); }}><i>✓</i>Reviewer path</button>
        </nav>
        <div className="side-foot">
          <div className="netbox"><b /><div><strong>StudioNet</strong><span>Project deployment · 61999</span></div></div>
          <a href={explorer} target="_blank" rel="noreferrer">Open in Explorer ↗</a>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">GenLayer StudioNet</p>
            <h2>{TITLES[tab]}</h2>
          </div>
          <div className="top-actions">
            <a className="btn-outline" href={explorer} target="_blank" rel="noreferrer">Explorer ↗</a>
            {me ? <span className="btn-outline wallet"><b />{short(me)}</span> : <button className="btn-outline wallet" onClick={connect}><b />Connect wallet</button>}
          </div>
        </header>

        <main className="main">
          {tab === "overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <p className="eyebrow">Builder project · Intelligent contracts</p>
                  <h1>Two courses.<br /><em>One wallet decides.</em></h1>
                  <p className="lead">
                    TheirCall asks validators one narrow semantic question: when a sentence puts two courses on the table, does
                    the pick belong to the side that must perform or the side that receives? The answer hands the single power
                    to elect to exactly one of the two wallets — for good.
                  </p>
                  <div className="row">
                    <button className="btn-accent" onClick={() => setTab("open")}>Open an option</button>
                    <button className="btn-outline" onClick={() => setTab("inspect")}>Inspect option</button>
                  </div>
                </div>
                <div className="diagram">
                  <div className="diagram-top"><span className="pill-ok">✓ Accepted state</span><span className="eyebrow">Who may elect</span></div>
                  <div className="nodes">
                    <div className="node"><b>¶</b><span>sentence</span></div>
                    <div className="edge"><span>read once</span></div>
                    <div className="node core"><b>⇋</b><span>CHOICE</span></div>
                    <div className="fork">
                      <div className="branch"><div className="edge"><span>performer picks</span></div><div className="node solid-node"><b>A</b><span>author</span></div></div>
                      <div className="branch"><div className="edge dashed"><span>receiver picks</span></div><div className="node ghost-node"><b>B</b><span>receiver</span></div></div>
                    </div>
                  </div>
                  <div className="diagram-foot">
                    <span>Semantic verdict</span>
                    <strong>PERFORMER_CHOOSES → AUTHOR &nbsp;/&nbsp; RECEIVER_CHOOSES → RECEIVER</strong>
                  </div>
                </div>
              </section>

              <section className="stats">
                <div className="stat wide"><p className="eyebrow">Live contract</p><strong>{CONTRACT_ADDRESS ? short(CONTRACT_ADDRESS, 8, 6) : "—"}</strong><span>Bound to the Project StudioNet deployment.</span></div>
                <div className="stat"><p className="eyebrow">Current option</p><strong>{current ? current.state : "—"}</strong><span>{current ? short(current.option_id, 8, 6) : "Inspect an option"}</span></div>
                <div className="stat"><p className="eyebrow">Holder</p><strong>{current ? current.holder : "—"}</strong><span>{current ? short(current.elector_wallet) : "Read from the contract"}</span></div>
                <div className="stat"><p className="eyebrow">Wallet role</p><strong className="role-text">{myRole ?? "—"}</strong><span>{me ? short(me) : "Connect wallet"}</span></div>
              </section>

              <section className="path" id="reviewer-path">
                <p className="eyebrow">Reviewer path · two wallets of your own</p>
                <ol>
                  <li><b>1</b><div><strong>Open two options</strong><span>With your first wallet, name your second wallet as receiver and open one option where you keep the choice and one where the receiver holds it (the two sentences are in the README).</span></div></li>
                  <li><b>2</b><div><strong>Compare as the author</strong><span>In Side by side, Elect is enabled on the first card and disabled on the second with “The choice here is not yours to make”.</span></div></li>
                  <li><b>3</b><div><strong>Switch to the receiver</strong><span>The two buttons swap: the same sentence now blocks the other wallet on the other card.</span></div></li>
                  <li><b>4</b><div><strong>Elect, then try to undo</strong><span>After an election, Withdraw is disabled with “This option has been elected; it can no longer be withdrawn”.</span></div></li>
                </ol>
              </section>
            </>
          )}

          {tab === "inspect" && (
            <>
              <section className="panel finder">
                <label>Option ID
                  <div className="row">
                    <input value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="64-character option id" spellCheck={false} />
                    <button className="btn-accent" onClick={() => loadById(idInput)}>Load</button>
                  </div>
                </label>
                <small className="muted">No wallet is required to inspect accepted state.</small>
                {recent.length > 0 && (
                  <div className="recent">
                    {recent.map((r) => <button key={r} className="link" onClick={() => loadById(r)}>{short(r, 8, 6)}</button>)}
                  </div>
                )}
              </section>
              {current ? (
                <OptionCard option={current} me={me} busy={busy} onElect={onElect} onObject={onObject} onWithdraw={onWithdraw} />
              ) : (
                <div className="empty">
                  <p>No option loaded. Paste an option id, or open one.</p>
                  <button className="link" onClick={() => setTab("open")}>Open an option →</button>
                </div>
              )}
            </>
          )}

          {tab === "open" && (
            <section className="panel">
              <p className="eyebrow">Author</p>
              <h3>Open an option</h3>
              <p className="muted">
                You are the side that must perform. Name the receiver and write a sentence that puts two courses on the table.
                The validators decide whose pick it is; unclear wording gives the pick to the receiver. The contract holds no
                money and does not check that an elected course is one of the two in the text.
              </p>
              <div className="grid2">
                <label>Receiver wallet<input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="0x…" spellCheck={false} /></label>
                <label>Receiver label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="how the sentence names them" />
                  <small>{pyLen(pyStrip(label))}/{MAX_LABEL_LENGTH}</small></label>
              </div>
              <label>Sentence<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
                <small>{pyLen(pyStrip(text))}/{MAX_TEXT_LENGTH} · <Meter bytes={openBytes} /></small></label>
              {localId && <p className="t-id">Option id if opened: <code>{localId}</code></p>}
              <div className="row">
                <button className="btn-accent" disabled={busy || openReason !== null || openBytes > CALLDATA_LIMIT} onClick={onOpen}>Open option</button>
                {openReason && <span className="why">{openReason}</span>}
                {!openReason && openBytes > CALLDATA_LIMIT && <span className="why">Calldata over {CALLDATA_LIMIT} bytes; shorten the text.</span>}
              </div>
              <p className="muted small">The sentence and label may not contain the tokens PERFORMER_CHOOSES or RECEIVER_CHOOSES; they are the answer tokens.</p>
            </section>
          )}

          {tab === "compare" && (
            <section className="panel">
              <p className="eyebrow">Same connected wallet</p>
              <h3>Side by side</h3>
              <p className="muted">Two options that differ in one word. One Elect enabled, one disabled — for the same wallet. Switch wallets and they swap.</p>
              <div className="grid2">
                <input value={leftId} onChange={(e) => setLeftId(e.target.value)} placeholder="first option id" spellCheck={false} />
                <input value={rightId} onChange={(e) => setRightId(e.target.value)} placeholder="second option id" spellCheck={false} />
              </div>
              <div className="row"><button className="btn-accent" onClick={loadPair}>Compare</button></div>
              <div className="pair">
                {pair.map((p, i) => (
                  <div key={i}>
                    {p ? <OptionCard option={p} me={me} busy={busy} onElect={onElect} onObject={onObject} onWithdraw={onWithdraw} /> : <p className="empty">No option loaded.</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {tx.phase !== "idle" && (
            <section className={`status status-${tx.phase}`}>
              <strong>{tx.phase === "delayed" ? "Submitted — confirmation delayed" : tx.phase}</strong>
              <span>{tx.message}</span>
              {tx.hash && <a href={`${EXPLORER_BASE}/tx/${tx.hash}`} target="_blank" rel="noreferrer"><code>{tx.hash}</code></a>}
              {tx.phase === "delayed" && <button onClick={checkAgain}>Check again</button>}
            </section>
          )}

          <footer className="foot">GenLayer StudioNet · the contract holds no money, moves nothing, and does not judge an election.</footer>
        </main>
      </div>
    </div>
  );
}
