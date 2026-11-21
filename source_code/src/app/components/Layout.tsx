"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ChevronRight, FileCheck2, LayoutDashboard, LogOut, MessageSquare, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", short: "Dashboard", description: "The bigger picture" },
  { path: "/verification", icon: FileCheck2, label: "Candidate Verification", short: "Verify", description: "Cross-check the declarations" },
  { path: "/compare", icon: Scale, label: "Candidate Comparison", short: "Compare", description: "See the differences clearly" },
  { path: "/chat", icon: MessageSquare, label: "AI Assistant", short: "Assistant", description: "Ask the data a question" },
  { path: "/insights", icon: BarChart3, label: "Data Insights", short: "Insights", description: "Explore the patterns" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal }).then(r => r.ok ? r.json() : { user: null }).then(data => setUser(data.user)).catch(() => {});
    return () => controller.abort();
  }, [pathname]);
  async function signOut() {
    setSigningOut(true); setSessionError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      setUser(null); router.refresh();
    } catch { setSessionError("Could not sign out. Check your connection and retry."); }
    finally { setSigningOut(false); }
  }
  if (pathname === "/login" || pathname === "/signup") return <>{children}</>;
  const active = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);
  const current = navigation.find(item => active(item.path));

  return (
    <div className="workspace-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside className="workspace-sidebar">
        <Link href="/" className="workspace-brand" aria-label="Chunav Bodh dashboard">
          <span className="brand-symbol"><ShieldCheck size={25} strokeWidth={1.8} /></span>
          <span><strong>Chunav Bodh<span className="brand-period">.</span></strong><small>ELECTION TRANSPARENCY</small></span>
        </Link>
        <p className="sidebar-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation" className="sidebar-navigation">
          {navigation.map(item => <Link key={item.path} href={item.path} aria-current={active(item.path) ? "page" : undefined} className={`sidebar-link ${active(item.path) ? "is-active" : ""}`}>
            <item.icon size={20} strokeWidth={1.7} /><span>{item.label}</span>{active(item.path) && <ChevronRight size={15} className="ml-auto" />}
          </Link>)}
        </nav>
        <div className="sidebar-assistant">
          <span className="sidebar-spark"><Sparkles size={22} /></span>
          <h2>A little clarity goes a long way.</h2>
          <p>Ask about candidates in English, Hinglish, हिन्दी or मराठी.</p>
          <Link href="/chat">Meet your AI assistant <MessageSquare size={15} /></Link>
        </div>
        <div className="sidebar-footer"><ShieldCheck size={17} /><span>Public information.<br /><strong>Clearer understanding.</strong></span></div>
      </aside>
      <div className="workspace-content">
        <header className="workspace-topbar">
          <Link className="mobile-brand" href="/"><ShieldCheck size={23} /><strong>Chunav Bodh.</strong></Link>
          <div className="workspace-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{current?.short ?? "Candidate profile"}</strong></div>
          <div className="topbar-actions">
            <span className="topbar-note"><ShieldCheck size={15} />Candidate affidavit explorer</span>
            <Link href="/chat" className="topbar-assistant"><Sparkles size={16} /><span>Ask AI</span></Link>
            {user ? <><span className="account-chip" title={user.name}><span>{user.name.charAt(0).toUpperCase()}</span><strong>{user.name}</strong></span><button type="button" onClick={signOut} disabled={signingOut} className="topbar-signout" aria-label={signingOut ? "Signing out" : "Sign out"} title="Sign out"><LogOut size={17} /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button></> : <Link href="/login" className="topbar-login">Log in</Link>}
          </div>
        </header>
        {sessionError && <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sessionError}</p>}
        <main id="main-content" className="workspace-main">{children}</main>
        <footer className="workspace-footer"><span>Chunav Bodh <span aria-hidden="true">·</span> Information that brings clarity.</span><span>Understand the record. Ask better questions.</span></footer>
      </div>
      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {navigation.map(item => <Link key={item.path} href={item.path} aria-current={active(item.path) ? "page" : undefined} className={active(item.path) ? "is-active" : ""}><item.icon size={21} strokeWidth={1.8} /><span>{item.short}</span></Link>)}
      </nav>
    </div>
  );
}
