// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supa";
import CustomerPanel from "./pages/CustomerPanel.jsx";
import BusinessPanel from "./pages/BusinessPanel.jsx";

/** Prosty wrapper do sprawdzenia uprawnień na trasie */
function ProtectedRoute({ when, redirect = "/", children }) {
  if (!when) return <Navigate to={redirect} replace />;
  return children;
}

/** Pasek nawigacji z dynamicznym menu */
function Navbar({ profile, onSignOut }) {
  const isBiz = profile?.user_type === "business";

  return (
    <header className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800">
      <Link to="/" className="text-2xl font-semibold">
        Free<span className="text-orange-500">Flow</span>
      </Link>

      <nav className="flex items-center gap-4">
        {/* Link kontekstowy – różny dla klienta vs biznesu */}
        {isBiz ? (
          <Link to="/business" className="hover:text-orange-400">Panel biznesowy</Link>
        ) : (
          <Link to="/customer" className="hover:text-orange-400">Twoje Zamówienia</Link>
        )}

        {/* Zawsze dostępne */}
        <Link to="/customer" className="hover:text-orange-400">Panel klienta</Link>

        {/* Profil / wylogowanie */}
        {profile ? (
          <button onClick={onSignOut} className="ml-2 rounded px-3 py-1 bg-zinc-800 hover:bg-zinc-700">
            Wyloguj {profile.email ? `(${profile.email})` : ""}
          </button>
        ) : (
          <Link to="/" className="ml-2 rounded px-3 py-1 bg-orange-600 hover:bg-orange-500">
            Zaloguj
          </Link>
        )}
      </nav>
    </header>
  );
}

/** Strona główna (placeholder) */
function Home() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">
        Voice to order — Złóż zamówienie
      </h1>
      <p className="opacity-80">Wybierz panel z menu powyżej.</p>
    </div>
  );
}

/** Główny App */
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // pobierz sesję i profil
  useEffect(() => {
    let ignore = false;

    async function loadSessionAndProfile() {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (ignore) return;

      setSession(sess?.session ?? null);

      const user = sess?.session?.user;
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, email, user_type, restaurant_id")
        .eq("id", user.id)
        .single();

      if (!ignore) {
        if (error) {
          console.error("profiles fetch error:", error);
          setProfile(null);
        } else {
          // fallback na email z auth jeśli brak w profiles
          setProfile({ ...prof, email: prof?.email || user.email });
        }
        setLoading(false);
      }
    }

    loadSessionAndProfile();

    // nasłuchuj zmian sesji (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession?.user) {
        setProfile(null);
      } else {
        // odśwież profil po zmianie sesji
        (async () => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, email, user_type, restaurant_id")
            .eq("id", newSession.user.id)
            .single();
          setProfile({ ...prof, email: prof?.email || newSession.user.email });
        })();
      }
    });

    return () => {
      ignore = true;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const isBiz = profile?.user_type === "business";

  return (
    <BrowserRouter>
      <Navbar profile={profile} onSignOut={handleSignOut} />

      <main className="max-w-5xl mx-auto w-full p-4">
        {loading ? (
          <div className="opacity-80">Ładowanie…</div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Panel klienta – wymaga zalogowania */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute when={!!session} redirect="/">
                  <CustomerPanel profile={profile} />
                </ProtectedRoute>
              }
            />

            {/* Panel biznesowy – wymaga roli business */}
            <Route
              path="/business"
              element={
                <ProtectedRoute when={!!session && isBiz} redirect="/customer">
                  <BusinessPanel profile={profile} />
                </ProtectedRoute>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </BrowserRouter>
  );
}
