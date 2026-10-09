"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppSidebar, type SidebarAccount, type SidebarUser } from "./app-sidebar";
import { Chat } from "./chat";
import { ChatProvider, useChat } from "./chat-provider";
import { Icon } from "./icon";
import { ProspectPreviewTabs } from "./prospect-preview-tabs";

const COLLAPSED = "decidely.sidebar-collapsed";

type Props = { user: SidebarUser; accounts: SidebarAccount[]; configured: boolean; children: React.ReactNode };

// Sidebar | page | chat. Below lg the sidebar is a drawer; below xl the chat is a drawer (a full sheet on phones).
export function DashboardShell(props: Props) {
  return (
    <ChatProvider configured={props.configured}>
      <Frame {...props} />
    </ChatProvider>
  );
}

function Frame({ user, accounts, children }: Props) {
  const chat = useChat()!;
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const chatButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
      if (localStorage.getItem(COLLAPSED) === "1") setCollapsed(true);
    } catch {}
  }, []);
  const collapse = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem(COLLAPSED, collapsed ? "0" : "1");
    } catch {}
  };

  const { close, drawer } = chat;
  const closeChat = useCallback(() => {
    close();
    chatButton.current?.focus();
  }, [close]);
  const closeMenu = useCallback(() => {
    setMenu(false);
    menuButton.current?.focus();
  }, []);

  // Escape closes whichever drawer is open, unless a dialog inside it is handling Escape itself.
  useEffect(() => {
    if (!menu && !drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (menu) closeMenu();
      else if (drawer) closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, drawer, closeMenu, closeChat]);

  return (
    <div lang="id" className="flex h-dvh overflow-hidden bg-background">
      <a href="#main" className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Lewati ke konten
      </a>

      {menu && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={closeMenu} aria-hidden />}
      <AppSidebar
        user={user}
        accounts={accounts}
        collapsed={collapsed && !menu}
        onCollapse={collapse}
        onNavigate={() => setMenu(false)}
        className={`${menu ? "fixed inset-y-0 left-0 z-40 flex w-72" : "hidden"} lg:static lg:z-auto lg:flex ${collapsed ? "lg:w-16" : "lg:w-72"} shrink-0`}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Preview tabs scroll beneath the fixed chat control. */}
        <header className="dashboard-preview-header">
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Buka menu"
            aria-expanded={menu}
            aria-controls="sidebar"
            className="flex size-10 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-ink lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <Suspense fallback={null}><ProspectPreviewTabs accounts={accounts} /></Suspense>
          <div className={`dashboard-chat-overlay ${chat.docked ? "xl:hidden" : ""}`}>
          <button
            ref={chatButton}
            type="button"
            onClick={chat.toggle}
            aria-controls="chat"
            className={`dashboard-chat-button flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm transition-colors duration-150 hover:border-white/50 pointer-coarse:min-h-11 ${
              chat.docked ? "xl:hidden" : ""
            }`}
          >
            <Icon name="chat" className="size-4" />
            Tanya AI
          </button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          {children}
        </main>
      </div>

      {chat.drawer && <div className="fixed inset-0 z-30 bg-black/60 xl:hidden" onClick={closeChat} aria-hidden />}
      <aside
        id="chat"
        aria-label="Chat"
        className={`${chat.drawer ? "fixed inset-0 z-40 flex sm:left-auto sm:w-[380px]" : "hidden"} ${
          chat.docked ? "xl:static xl:z-auto xl:flex xl:w-[380px]" : "xl:hidden"
        } shrink-0 flex-col border-l border-line bg-panel`}
      >
        <Chat onClose={closeChat} />
      </aside>
    </div>
  );
}
