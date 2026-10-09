"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Cite, Visual } from "~/server/chat-visuals";

export type Query = { cypher: string; rows: number; error?: string };
export type Msg = { role: "user" | "assistant"; content: string; queries?: Query[]; seconds?: number; visuals?: Visual[]; cites?: Cite[] };
// The account on screen. graphIds lets chat graphs offer "highlight in Jalur bukti" only for nodes that exist there.
export type Scope = { accountId: string; name: string; asOf: string; graphIds: string[] };
type ChatError = { text: string; retry: string; login?: boolean };

type ChatState = {
  configured: boolean;
  msgs: Msg[];
  pending: boolean;
  error: ChatError | null;
  scope: Scope | null;
  scoped: boolean; // false when the user removed the context chip for the next question
  setScoped: (on: boolean) => void;
  setScope: (s: Scope | null) => void;
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;
  send: (text: string) => void;
  ask: (text: string) => void; // opens the panel, then sends
  clear: () => void;
  docked: boolean; // the column at xl and up
  drawer: boolean; // the overlay below xl
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const Ctx = createContext<ChatState | null>(null);
export const useChat = () => useContext(Ctx);

const MSGS = "decidely.chat";
const DOCKED = "decidely.chat-docked";
const wide = () => window.matchMedia("(min-width: 1280px)").matches;

export function ChatProvider({ configured, children }: { configured: boolean; children: React.ReactNode }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [scoped, setScoped] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [docked, setDocked] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const busy = useRef(false);
  const latest = useRef<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Storage is a convenience: private windows and blocked storage just start empty.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(MSGS);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
      if (saved) setMsgs(JSON.parse(saved));
      if (localStorage.getItem(DOCKED) === "0") setDocked(false);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    latest.current = msgs;
    // Not before the restore has rendered, or the empty first render overwrites the saved conversation.
    if (!loaded) return;
    try {
      sessionStorage.setItem(MSGS, JSON.stringify(msgs.slice(-30)));
    } catch {}
  }, [msgs, loaded]);

  const dock = useCallback((on: boolean) => {
    setDocked(on);
    try {
      localStorage.setItem(DOCKED, on ? "1" : "0");
    } catch {}
  }, []);
  const open = useCallback(() => (wide() ? dock(true) : setDrawer(true)), [dock]);
  const close = useCallback(() => (wide() ? dock(false) : setDrawer(false)), [dock]);
  const toggle = useCallback(() => (wide() ? dock(!docked) : setDrawer((d) => !d)), [dock, docked]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy.current) return;
      busy.current = true;
      const history = latest.current;
      const next: Msg[] = [...history, { role: "user", content: question }];
      setMsgs(next);
      setError(null);
      setPending(true);
      const context = scoped && scope ? { accountId: scope.accountId, asOf: scope.asOf, selectedNodeId: selectedNode ?? undefined } : undefined;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })), context }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError({ text: "Sesi Anda berakhir. Masuk lagi untuk bertanya.", retry: question, login: true });
          setMsgs(history);
          return;
        }
        if (!res.ok || !data.answer) throw new Error(data.error ?? "Tidak ada jawaban yang kembali.");
        setMsgs([...next, { role: "assistant", content: data.answer, queries: data.queries, seconds: data.seconds, visuals: data.visuals, cites: data.cites }]);
        setScoped(true);
      } catch (e) {
        setError({ text: e instanceof Error ? e.message : "Permintaan gagal.", retry: question });
        setMsgs(history);
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [scope, scoped, selectedNode],
  );

  const ask = useCallback(
    (text: string) => {
      open();
      send(text);
    },
    [open, send],
  );
  const clear = useCallback(() => {
    setMsgs([]);
    setError(null);
  }, []);

  const value = useMemo<ChatState>(
    () => ({ configured, msgs, pending, error, scope, scoped, setScoped, setScope, selectedNode, setSelectedNode, send, ask, clear, docked, drawer, open, close, toggle }),
    [configured, msgs, pending, error, scope, scoped, selectedNode, send, ask, clear, docked, drawer, open, close, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Rendered by a page to tell the chat which account is on screen. Clears itself when the page goes away.
export function ChatScope({ accountId, name, asOf, graphIds }: Scope) {
  const chat = useChat();
  const setScope = chat?.setScope;
  const setSelectedNode = chat?.setSelectedNode;
  const ids = graphIds.join(",");
  useEffect(() => {
    setScope?.({ accountId, name, asOf, graphIds: ids.split(",") });
    setSelectedNode?.(null);
    return () => setScope?.(null);
  }, [setScope, setSelectedNode, accountId, name, asOf, ids]);
  return null;
}
