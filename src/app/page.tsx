"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/client";

const muted = "text-gray-500 dark:text-gray-400";
const error = "wrap-anywhere text-red-600 dark:text-red-400";
const control = "min-h-11 rounded border px-3";

export default function Home() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [me, setMe] = useState("");
  const [email, setEmail] = useState("");

  const users = useQuery(trpc.user.list.queryOptions());
  const following = useQuery({ ...trpc.user.following.queryOptions({ userId: me }), enabled: !!me });
  const suggestions = useQuery({ ...trpc.user.suggestions.queryOptions({ userId: me }), enabled: !!me });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.user.pathKey() });
  const create = useMutation(trpc.user.create.mutationOptions({ onSuccess: () => { setEmail(""); invalidate(); } }));
  const follow = useMutation(trpc.user.follow.mutationOptions({ onSuccess: invalidate }));

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold">Users (Postgres) + Follows (Neo4j)</h1>
        <p className={`text-sm ${muted}`}>Dev test page, draft without direction.</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); create.mutate({ email }); }}>
        <label htmlFor="new-email" className="mb-1 block text-sm font-medium">New user email</label>
        <div className="flex gap-2">
          <input
            id="new-email" className={`${control} min-w-0 flex-1`}
            type="email" placeholder="ana@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <button className={`${control} bg-foreground text-background disabled:opacity-50`} disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>
      {create.error && <p className={error}>{create.error.message}</p>}

      <label className="flex flex-wrap items-center gap-2">
        Acting as
        <select className={control} value={me} onChange={(e) => setMe(e.target.value)}>
          <option value="">Select a user</option>
          {users.data?.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
      </label>

      {users.isPending ? (
        <p className={muted}>Loading users…</p>
      ) : users.isError ? (
        <p className={error}>Could not load users: {users.error.message}</p>
      ) : users.data.length === 0 ? (
        <p className={muted}>No users yet. Add one above.</p>
      ) : (
        <ul className="divide-y rounded border">
          {users.data.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-1">
              <span className="min-w-0 break-all">{u.email}</span>
              {me && me !== u.id && (
                following.data?.includes(u.id)
                  ? <span className={`text-sm ${muted}`}>following</span>
                  : <button
                      className="min-h-11 px-3 text-sm text-blue-600 disabled:opacity-50 dark:text-blue-400"
                      disabled={follow.isPending || following.isPending}
                      onClick={() => follow.mutate({ followerId: me, followeeId: u.id })}
                    >follow</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {following.isError && <p className={error}>Could not load follows: {following.error.message}</p>}
      {follow.error && <p className={error}>Follow failed: {follow.error.message}</p>}

      {me && (
        <section>
          <h2 className="font-semibold">Suggestions (friends of friends)</h2>
          {suggestions.isPending ? (
            <p className={muted}>Loading suggestions…</p>
          ) : suggestions.isError ? (
            <p className={error}>Could not load suggestions: {suggestions.error.message}</p>
          ) : suggestions.data.length ? (
            <ul>{suggestions.data.map((s) => <li key={s.id}>{s.email} · {s.mutuals} mutual</li>)}</ul>
          ) : (
            <p className={muted}>None yet. Follow someone who follows others.</p>
          )}
        </section>
      )}
    </main>
  );
}
