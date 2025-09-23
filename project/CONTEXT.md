# project/CONTEXT.md
Cel: przywrócić klasyczny UI FreeFlow (tło restauracji, logo, pole wyszukiwania, 3 kategorie),
zachować obecną funkcjonalność wyszukiwania i "Dopytaj Gemini".

Stan:
- Deploy działający (GitHub Pages): <tu wstaw URL>
- Branch ochronny: `backup-classic-ui` (tylko do podglądu/stabilna kopia)
- Praca rozwojowa: `freeflow-frontend-classic`
- Backend lokalny (Node): działa na porcie 3003 (lub opisz aktualnie)

Technologia frontu docelowo:
- Vite + React, bez Tailwinda (korzystamy z CSS z bundla – `ui.css`)
- Struktura: public/ (obrazy, ui.css), src/pages/HomeClassic.jsx
