# Contexto para el chat de SushiGO — Integración con Divoon

## Qué debe saber este chat

El proyecto SushiGO tiene una integración con **Divoon** (API Node.js siempre activa)
para llevar el contador de victorias mensuales entre **Gato** y **Pingu**.

Cuando una partida termina y los jugadores son exactamente Gato y Pingu,
SushiGO debe llamar a Divoon para registrar quién ganó.

---

## Endpoint a consumir

```
POST https://<DIVOON_URL>/games/sushigo/win
Content-Type: application/json

Body:
{
  "winner": "gato"   // o "pingu" — siempre en minúsculas
}
```

### Respuesta exitosa (201):
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "...",
      "winner": "gato",
      "playedAt": "2025-12-28T20:00:00.000Z",
      "periodStart": "2025-12-26T00:00:00.000Z"
    },
    "current": {
      "gato": { "wins": 3 },
      "pingu": { "wins": 1 },
      "total": 4
    }
  }
}
```

### Errores posibles:
- `400` — winner no es "gato" ni "pingu"
- `500` — error interno (Divoon caído o DB no disponible)

---

## Cuándo llamarlo

- **Solo** cuando los jugadores de la partida son exactamente **Gato** y **Pingu**.
- Al finalizar el flujo de resultados (`/results` o pantalla de ganador).
- La llamada es fire-and-forget: si falla, no bloquear la UI de SushiGO.
  Loguear el error en consola pero dejar que el juego continúe normalmente.

---

## Identificar a Gato y Pingu

En el store de SushiGO, los jugadores tienen `name` (string libre).
La detección debe ser por nombre normalizado:

```js
const normalize = (name) => name.trim().toLowerCase();

const isGatoVsPingu = (players) => {
    const names = players.map(p => normalize(p.name));
    return names.includes('gato') && names.includes('pingu') && players.length === 2;
};

const getWinnerKey = (winnerName) => {
    const n = normalize(winnerName);
    if (n === 'gato') return 'gato';
    if (n === 'pingu') return 'pingu';
    return null; // No registrar si no es ninguno de los dos
};
```

---

## Variable de entorno necesaria en SushiGO

```env
VITE_DIVOON_URL=https://<url-de-divoon>
```

---

## Ejemplo de integración en Results.jsx

```js
// Al montar Results, si fue una partida Gato vs Pingu:
useEffect(() => {
    const divoonUrl = import.meta.env.VITE_DIVOON_URL;
    if (!divoonUrl) return;
    if (!isGatoVsPingu(players)) return;

    const winnerKey = getWinnerKey(winner.name);
    if (!winnerKey) return;

    fetch(`${divoonUrl}/games/sushigo/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerKey }),
    })
    .then(res => res.json())
    .then(data => console.log('[Divoon] Win registrado:', data.data?.current))
    .catch(err => console.warn('[Divoon] Error registrando win (no bloqueante):', err));
}, []);
```

---

## Lo que NO hace este chat sobre Divoon

- No implementa el cierre mensual (eso es responsabilidad de Mesesaurios).
- No muestra el histórico mensual (eso también es Mesesaurios).
- Solo registra victorias — una llamada simple al terminar la partida.
