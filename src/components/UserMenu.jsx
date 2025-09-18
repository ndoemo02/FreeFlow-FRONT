// src/components/UserMenu.jsx
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";

export default function UserMenu() {
  const nav = useNavigate();
  const { userType, loading } = useUser();

  if (loading) return null;

  const isBiz = userType === "business";

  const handleOrdersClick = () => {
    nav(isBiz ? "/panel-biznesu" : "/panel-klienta");
  };

  return (
    <div className="menu">
      <button onClick={() => nav(isBiz ? "/panel-biznesu" : "/panel-klienta")}>
        {isBiz ? "Panel biznesowy" : "Panel obsługi klienta"}
      </button>

      {/* Pokaż odpowiedni punkt menu */}
      {isBiz ? (
        <button onClick={handleOrdersClick}>Zamówienia restauracji</button>
      ) : (
        <button onClick={handleOrdersClick}>Twoje Zamówienia</button>
      )}

      {/* …reszta pozycji wspólnych… */}
    </div>
  );
}
