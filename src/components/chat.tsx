"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Cite } from "~/server/chat-visuals";
import type { Check } from "~/server/jev";
import { ChatVisual } from "./chat-visual";
import { useChat } from "./chat-provider";
import { useSources } from "./source-provider";
import { Icon } from "./icon";

const GLOBAL = [
  "Siapa yang menyetujui diskon 15% untuk C01, dan apa yang dijanjikan sebagai gantinya?",
  "Diskon di atas 10% mana saja yang disetujui, dan oleh siapa?",
  "Janji fitur mana yang belum ditepati?",
  "Kenapa deal DL-006 kalah?",
  "Keputusan mana yang masih menunggu jawaban?",
  "Apakah champion CRM di C01 masih bekerja di sana?",
];

const iconButton =
  "flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-white/5 hover:text-ink pointer-coarse:size-11";

// Lets any button on a dashboard page put a question to the chat.
export function AskButton({ question, className, children }: { question: string; className?: string; children: React.ReactNode }) {
  const chat = useChat();
  const sources = useSources();
  if (!chat) return null;
  return (
    <button type="button" className={className} onClick={() => { sources?.close(); chat.ask(question); }}>
      {children}
    </button>
  );
}

export function Chat({ onClose }: { onClose: () => void }) {
  const chat = useChat()!;
  const router = useRouter();
  const [input, setInput] = useState("");
  const [record, setRecord] = useState<Cite | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const { scope, msgs, pending, error } = chat;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending, error]);

  const starters = scope
    ? [
        `Siapa pemutus pengadaan di ${scope.name}?`,
        `Siapa saja yang terlibat di ${scope.accountId} dan apa perannya?`,
        `Keputusan apa di log yang relevan untuk ${scope.accountId}?`,
        `Siapa yang perlu didekati berikutnya di ${scope.accountId}, dan kenapa?`,
      ]
    : GLOBAL;
  const submit = () => {
    if (!input.trim() || pending) return;
    chat.send(input);
    setInput("");
  };
  const openCite = (c: Cite) => {
    if (c.kind === "account") router.push(`/dashboard?q=${c.id}${scope ? `&asof=${scope.asOf}` : ""}`);
    else setRecord(c);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <h2 className="text-sm font-medium">Tanya graph</h2>
        <div className="chat-header-actions ml-auto flex items-center">
          {msgs.length > 0 && (
            <button type="button" onClick={chat.clear} aria-label="Hapus percakapan" title="Hapus percakapan" className={`${iconButton} chat-utility-button`}>
              <Icon name="trash" className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Tutup chat" title="Tutup chat" className={`${iconButton} chat-utility-button`}>
            <Icon name="close" className="size-4" />
          </button>
        </div>
      </div>

      <div ref={log} role="log" aria-live="polite" aria-busy={pending} className="relative flex-1 space-y-5 overflow-y-auto p-4">
        {msgs.length === 0 && !pending && !error && (
          <div>
            <p className="font-medium">{scope ? `Tanya tentang ${scope.name}` : "Tanya tentang keputusan"}</p>
            <p className="mt-1 text-sm text-muted">Jawaban berasal dari query ke graph. Pilih satu atau tulis sendiri.</p>
            <ul className="mt-4 space-y-2">
              {starters.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => chat.send(q)}
                    disabled={!chat.configured}
                    className="min-h-11 w-full cursor-pointer rounded-lg border border-line px-3 py-2 text-left text-sm transition-colors duration-150 hover:border-white/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
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
            <p key={i} className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2.5 text-sm">
              {m.content}
            </p>
          ) : (
            <div key={i} className="space-y-3 text-sm">
              {m.queries && m.queries.length > 0 && (
                <details className="text-xs text-muted">
                  <summary className="min-h-6 cursor-pointer">
                    {m.queries.length} query dalam {m.seconds} detik
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {m.queries.map((q, j) => (
                      <li key={j} className="rounded-md border border-line bg-background p-2.5">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink">{q.cypher}</pre>
                        <p className="mt-1">{q.error ? `Ditolak: ${q.error}` : `${q.rows} baris`}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <Answer text={m.content} cites={m.cites ?? []} onCite={openCite} />
              {m.check && <JevCheck check={m.check} />}
              {m.visuals?.map((v, j) => <ChatVisual key={j} v={v} />)}
            </div>
          ),
        )}

        {pending && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none" aria-hidden />
            Menjalankan query ke graph. Pertanyaan sulit bisa sampai satu menit.
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-danger p-3 text-sm">
            <p className="break-words">{error.text}</p>
            {error.login ? (
              <Link href="/login" className="mt-2 inline-flex min-h-10 items-center rounded-md bg-ink px-4 font-medium text-background">
                Masuk lagi
              </Link>
            ) : (
              <button
                type="button"
                className="mt-2 min-h-10 cursor-pointer rounded-md bg-ink px-4 font-medium text-background transition-opacity duration-150 hover:opacity-90"
                onClick={() => chat.send(error.retry)}
              >
                Tanya lagi
              </button>
            )}
          </div>
        )}
      </div>

      {chat.configured ? (
        <form
          className="shrink-0 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {scope && chat.scoped && (
            <p className="mb-2 flex items-center gap-1 text-xs text-muted">
              <span className="rounded border border-line px-1.5 py-0.5">
                Konteks: {scope.accountId}
                {chat.selectedNode ? ` · ${chat.selectedNode}` : ""}
              </span>
              <button
                type="button"
                onClick={() => chat.setScoped(false)}
                aria-label="Tanya tanpa konteks akun untuk pertanyaan berikutnya"
                className="flex size-6 cursor-pointer items-center justify-center rounded hover:bg-white/10 hover:text-ink"
              >
                <Icon name="close" className="size-3" />
              </button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Pertanyaan Anda
            </label>
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={2000}
              placeholder="Tanya sesuatu… (Shift+Enter untuk baris baru)"
              className="max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-md border border-line bg-background px-3 py-2.5 text-sm [field-sizing:content] placeholder:text-muted"
            />
            <button
              disabled={pending || !input.trim()}
              aria-label="Kirim"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent text-black transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="send" className="size-4" />
            </button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t border-line p-4 text-sm text-muted">
          Chat belum dikonfigurasi. Tambahkan <code className="text-ink">DEEPSEEK_API_KEY</code> ke <code className="text-ink">.env</code>, lalu jalankan ulang
          server.
        </p>
      )}

      <RecordDrawer record={record} onClose={() => setRecord(null)} />
    </div>
  );
}

// The answer as plain text, with every validated ID turned into a button.
// Jev's reading of whether the answer stays within the query results (FR-11). Shown only when the check is on.
function JevCheck({ check }: { check: Check }) {
  if ("skipped" in check) return <p className="mt-2 text-xs text-muted">Tidak diperiksa Jev: {check.skipped}.</p>;
  const p = check.supported.toFixed(2).replace(".", ",");
  return check.warn ? (
    <p className="mt-2 text-xs text-warn">
      Jev ({p}): sebagian isi jawaban mungkin tidak didukung hasil query. Cek sitasinya sebelum dipakai.
    </p>
  ) : (
    <p className="mt-2 text-xs text-muted">Diperiksa Jev ({p}): isi jawaban didukung hasil query.</p>
  );
}

function Answer({ text, cites, onCite }: { text: string; cites: Cite[]; onCite: (c: Cite) => void }) {
  const byId = new Map(cites.map((c) => [c.id, c]));
  const parts = byId.size ? text.split(new RegExp(`\\b(${[...byId.keys()].join("|")})\\b`)) : [text];
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        const c = byId.get(part);
        return c ? (
          <button
            key={i}
            type="button"
            onClick={() => onCite(c)}
            title={`${c.label} · ${c.file}:${c.row}`}
            className="chat-citation mx-0.5 inline-flex cursor-pointer items-center px-1 font-mono text-xs text-accent transition-colors duration-150"
          >
            {part}
          </button>
        ) : (
          part
        );
      })}
    </p>
  );
}

function RecordDrawer({ record, onClose }: { record: Cite | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (record) ref.current?.showModal();
  }, [record]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="record-title"
      className="m-auto max-h-[85dvh] w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-0 text-ink backdrop:bg-black/60"
    >
      {record && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div className="min-w-0">
              <h2 id="record-title" className="font-medium">
                {record.id} · {record.label}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {record.file}:{record.row}
              </p>
            </div>
            <form method="dialog">
              <button aria-label="Tutup" className={`${iconButton} chat-utility-button`}>
                <Icon name="close" className="size-4" />
              </button>
            </form>
          </div>
          <dl className="relative grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2 overflow-y-auto p-4 text-sm">
            {Object.entries(record.fields)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-xs text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </dialog>
  );
}
