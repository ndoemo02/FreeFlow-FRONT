# project/RULES.md
1) Tylko jedna gałąź robocza naraz: `freeflow-frontend-classic`.
2) Każde zadanie to osobny commit z opisem. Żadnych reformatów całego repo w tym samym commicie.
3) Agent **nie zmienia** plików spoza zadania. Zawsze generuje DIFF (lista zmienionych plików).
4) Jeśli coś wymaga sekretów – używa `.env` (nie commitujemy sekretów).
5) Po każdej zmianie: `npm run dev` lokalnie + krótki test manualny → dopiero push.
