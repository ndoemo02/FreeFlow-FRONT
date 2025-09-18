// src/pages/CustomerPanel.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supa";

export default function CustomerPanel({ userId }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // 🔹 pobierz zamówienia na start
    const fetchOrders = async () => {
      let { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer", userId)
        .order("created_at", { ascending: false });

      if (!error) setOrders(data);
    };

    fetchOrders();

    // 🔹 realtime subskrypcja
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer=eq.${userId}` },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div>
      <h2>Twoje zamówienia</h2>
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            {o.restaurant} → {o.status} ({o.payment_status})
          </li>
        ))}
      </ul>
    </div>
  );
}
