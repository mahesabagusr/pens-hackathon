"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Query = { cypher: string; rows: number; error?: string };
type Msg = { role: "user" | "assistant"; content: string; queries?: Query[]; seconds?: number };

const QUESTIONS = [
  "Who approved the 15% discount for C01, and what did they promise in return?",
  "Which discounts above 10% were approved, and by whom?",
  "Which feature promises have not been kept?",
  "Why did we lose deal DL-006?",
  "Which decisions are still waiting for an answer?",
  "Is the CRM champion at C01 still working there?",
];

const ASK_EVENT = "ask-graph";

// Lets any button on the page put a question to the chat.
export function AskButton({ question, className, children }: { question: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: question }));
      }}
    >
      {children}
    </button>
  );
}

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; retry: string } | null>(null);
  const log = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (text: string, history: Msg[]) => {
      const question = text.trim();
      if (!question || pending) return;
      const next: Msg[] = [...history, { role: "user", content: question }];
      setMsgs(next);
      setInput("");
      setError(null);
      setPending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })).slice(-12) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.answer) throw new Error(data.error ?? "No answer came back.");
        setMsgs([...next, { role: "assistant", content: data.answer, queries: data.queries, seconds: data.seconds }]);
      } catch (e) {
        setError({ text: e instanceof Error ? e.message : "Request failed.", retry: question });
        setMsgs(history);
      } finally {
        setPending(false);
      }
    },
    [pending],
  );

  useEffect(() => {
    const onAsk = (e: Event) => send((e as CustomEvent<string>).detail, msgs);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, [send, msgs]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending, error]);

  return (
    <section id="chat" aria-label="Ask the graph" className="flex min-h-[32rem] scroll-mt-4 flex-col lg:h-[40rem]">
      <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {msgs.length === 0 && !pending && !error && (
          <div>
            <p className="font-display text-xl">Ask about a decision</p>
            <p className="mt-1 text-sm text-muted">Pick one or write your own. Answers come from queries against the graph.</p>
            <ul className="mt-4 space-y-2">
              {QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => send(q, msgs)}
                    className="min-h-11 w-full rounded-xl border border-line bg-white px-4 py-2 text-left text-sm hover:border-ink"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-[1.4rem] bg-night px-4 py-3 text-white">
              {m.content}
            </p>
          ) : (
            <div key={i} className="max-w-prose">
              {m.queries && m.queries.length > 0 && (
                <details className="mb-3 text-sm text-muted">
                  <summary className="min-h-6 cursor-pointer">
                    Ran {m.queries.length} {m.queries.length === 1 ? "query" : "queries"} in {m.seconds}s
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {m.queries.map((q, j) => (
                      <li key={j} className="rounded-xl border border-line bg-panel p-3">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-ink">{q.cypher}</pre>
                        <p className="mt-1 text-xs">{q.error ? `Rejected: ${q.error}` : `${q.rows} rows`}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
            </div>
          ),
        )}

        {pending && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none" aria-hidden />
            Querying the graph. Hard questions take up to a minute.
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-danger bg-panel p-4 text-sm">
            <p className="break-words">{error.text}</p>
            <button
              type="button"
              className="mt-2 min-h-11 rounded-[10px] bg-night px-4 text-white"
              onClick={() => send(error.retry, msgs)}
            >
              Ask again
            </button>
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-line p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, msgs);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Who approved the last discount above 10%?"
          className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3 placeholder:text-muted"
        />
        <button
          disabled={pending || !input.trim()}
          className="min-h-11 rounded-[10px] bg-accent px-5 font-medium text-black disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
