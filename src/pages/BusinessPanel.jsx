// src/pages/BusinessPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supa";

export default function BusinessPanel({ user }) {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const channelRef = useRef(null);

  // --------- pomocnicze: nazwa restauracji po id ----------
  const rName = useMemo(() => {
    const map = new Map();
    restaurants.forEach((r) => map.set(r.id, r.name));
    return (id) => map.get(id) || id;
  }, [restaurants]);

  // --------- ładowanie restauracji właściciela -------------
  useEffect(() => {
    let alive = true;

    const loadRestaurants = async () => {
      if (!user?.id) return;
      setError(null);
      setLoading(true);

      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name")
        .eq("owner", user.id)
        .order("name");

      if (!alive) return;

      if (error) {
        console.error(error);
        setError("Nie udało się pobrać restauracji.");
        setRestaurants([]);
        setRestaurantId(null);
      } else {
        setRestaurants(data || []);
        // wybierz pierwszą z listy jeśli nic nie wybrane
        if ((data?.length || 0) > 0 && !restaurantId) {
          setRestaurantId(data[0].id);
        } else if ((data?.length || 0) === 0) {
          setRestaurantId(null);
        }
      }

      setLoading(false);
    };

    loadRestaurants();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // --------- ładowanie zamówień + realtime -----------------
  useEffect(() => {
    let alive = true;

    const loadOrders = async () => {
      setError(null);

      // brak wybranej restauracji -> czyścimy listę i nie subskrybujemy
      if (!restaurantId) {
        setOrders([]);
        channelRef.current?.unsubscribe();
        channelRef.current = null;
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant", restaurantId)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error(error);
        setError("Nie udało się pobrać zamówień.");
        setOrders([]);
      } else {
        setOrders(data || []);
      }

      setLoading(false);

      // realtime: odsubskrybuj poprzedni kanał
      channelRef.current?.unsubscribe();
      channelRef.current = supabase
        .channel(`orders-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant=eq.${restaurantId}`,
          },
          (payload) => {
            setOrders((prev) => {
              const row = payload.new ?? payload.old;
              switch (payload.eventType) {
                case "INSERT":
                  // wstaw na początek, jeśli nie ma
                  if (prev.some((p) => p.id === row.id)) return prev;
                  return [payload.new, ...prev];
                case "UPDATE":
                  return prev.map((p) => (p.id === row.id ? payload.new : p));
                case "DELETE":
                  return prev.filter((p) => p.id !== row.id);
                default:
                  return prev;
              }
            });
          }
        )
        .subscribe();
    };

    loadOrders();

    return () => {
      alive = false;
      channelRef.current?.unsubscribe();
    };
  }, [restaurantId]);

  // --------- akcje na zamówieniu ----------------------------
  const updateOrder = async (id, patch) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) {
      console.error(error);
      setError("Nie udało się zaktualizować zamówienia.");
    }
    setBusy(false);
  };

  const acceptOrder = (id) =>
    updateOrder(id, { status: "accepted", updated_at: new Date().toISOString() });

  const completeAndPay = (id) =>
    updateOrder(id, {
      status: "completed",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    });

  const cancelOrder = (id) =>
    updateOrder(id, { status: "cancelled", updated_at: new Date().toISOString() });

  // --------- UI --------------------------------------------
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Panel biznesowy</h1>

      {/* wybór restauracji */}
      <div className="mb-4">
        <label className="block text-sm mb-1">Restauracja</label>
        <select
          className="w-full rounded border px-3 py-2 bg-transparent"
          value={restaurantId || ""}
          onChange={(e) => setRestaurantId(e.target.value || null)}
        >
          {restaurants.length === 0 && <option value="">(brak restauracji)</option>}
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && <p className="opacity-70">Ładowanie…</p>}

      {!loading && restaurantId && orders.length === 0 && (
        <p className="opacity-70">Brak zamówień dla „{rName(restaurantId)}”.</p>
      )}

      {!loading && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm opacity-70">{rName(o.restaurant)}</div>
                  <div className="font-mono text-sm">{o.id}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border px-2 py-1 text-xs opacity-80">
                    {o.status}
                  </span>
                  <span className="rounded-full border px-2 py-1 text-xs opacity-60">
                    {o.payment_status || "unpaid"}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-sm opacity-80">
                <div>
                  <b>Kwota:</b> {Number(o.total ?? 0).toFixed(2)} zł
                </div>
                {o.delivery_address && (
                  <div>
                    <b>Adres:</b> {o.delivery_address}
                  </div>
                )}
                {o.customer_notes && (
                  <div className="italic">„{o.customer_notes}”</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy || o.status !== "placed"}
                  onClick={() => acceptOrder(o.id)}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                  title="placed → accepted"
                >
                  Akceptuj
                </button>

                <button
                  disabled={busy || (o.status !== "accepted" && o.status !== "placed")}
                  onClick={() => completeAndPay(o.id)}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                  title="accepted → completed + paid"
                >
                  Zakończ + opłać
                </button>

                <button
                  disabled={busy || o.status === "cancelled" || o.status === "completed"}
                  onClick={() => cancelOrder(o.id)}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Anuluj
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
