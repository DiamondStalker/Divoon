# Contexto para el chat de Mesesaurios — Integración con Divoon

## Qué debe saber este chat

Mesesaurios tiene integración con **Divoon** (API Node.js siempre activa) para:

1. **Cualquier día** — mostrar cómo va el mes actual entre Gato y Pingu en SushiGO.
2. **El día 26** — hacer el cierre del periodo, guardar el histórico y mostrar el ganador del mes.
3. **Sección de historial** — mostrar todos los meses anteriores con sus resultados.

El periodo va del **26 de un mes al 26 del siguiente**.
Divoon calcula automáticamente en qué periodo cae cada consulta — Mesesaurios no necesita enviar fechas.

---

## Endpoints disponibles

### 1. GET — Estado del periodo activo
```
GET https://<DIVOON_URL>/games/sushigo/current
```

**Cuándo usarlo:** En cualquier momento que Mesesaurios quiera mostrar cómo va el mes.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "periodStart": "2025-12-26T00:00:00.000Z",
    "periodEnd": "2026-01-26T00:00:00.000Z",
    "label": "Diciembre 26 - Enero 26",
    "leading": "gato",
    "gato": { "wins": 5 },
    "pingu": { "wins": 3 },
    "totalGames": 8
  }
}
```

`leading` puede ser `"gato"`, `"pingu"`, `"empate"` o `"sin partidas"`.

---

### 2. POST — Cierre del periodo (día 26)
```
POST https://<DIVOON_URL>/games/sushigo/close
Content-Type: application/json
```
No requiere body.

**Cuándo usarlo:** Una sola vez el día 26, cuando Mesesaurios ejecuta su lógica de cumplemes.
Divoon guarda el histórico y resetea el contador (las partidas nuevas empiezan en el nuevo periodo).

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "data": {
    "record": {
      "periodStart": "2025-12-26T00:00:00.000Z",
      "periodEnd": "2026-01-26T00:00:00.000Z",
      "label": "Diciembre 26 - Enero 26",
      "winner": "gato",
      "gato": { "wins": 5 },
      "pingu": { "wins": 3 },
      "totalGames": 8,
      "closedAt": "2026-01-26T00:00:00.000Z"
    }
  }
}
```

**Error 409 — periodo ya cerrado:**
```json
{
  "success": false,
  "error": "Este periodo ya fue cerrado anteriormente."
}
```
Si Mesesaurios recibe un 409, simplemente ignorarlo — el cierre ya ocurrió.

---

### 3. GET — Histórico de todos los periodos
```
GET https://<DIVOON_URL>/games/sushigo/history
GET https://<DIVOON_URL>/games/sushigo/history?year=2025
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "label": "Diciembre 26 - Enero 26",
        "winner": "gato",
        "gato": { "wins": 5 },
        "pingu": { "wins": 3 },
        "totalGames": 8,
        "periodStart": "2025-12-26T00:00:00.000Z",
        "periodEnd": "2026-01-26T00:00:00.000Z",
        "closedAt": "2026-01-26T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

---

## Variable de entorno necesaria en Mesesaurios

```env
VITE_DIVOON_URL=https://<url-de-divoon>
```

---

## Ejemplo de integración — día 26 (lógica de cumplemes)

```js
// En el componente o función que ya maneja el día 26:

async function handleCumplemes() {
    const divoonUrl = import.meta.env.VITE_DIVOON_URL;
    if (!divoonUrl) return null;

    try {
        // 1. Obtener estado actual antes de cerrar (para mostrar al usuario)
        const currentRes = await fetch(`${divoonUrl}/games/sushigo/current`);
        const current = await currentRes.json();

        // 2. Cerrar el periodo
        const closeRes = await fetch(`${divoonUrl}/games/sushigo/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (closeRes.status === 409) {
            // Ya fue cerrado, solo retornar los datos actuales
            return current.data;
        }

        const closeData = await closeRes.json();
        return closeData.data.record;

    } catch (err) {
        console.warn('[Divoon] Error en cierre mensual:', err);
        return null;
    }
}
```

---

## Ejemplo de integración — widget "este mes"

```js
// Componente que muestra el contador del mes en curso:

async function fetchCurrentMonth() {
    const divoonUrl = import.meta.env.VITE_DIVOON_URL;
    if (!divoonUrl) return null;

    try {
        const res = await fetch(`${divoonUrl}/games/sushigo/current`);
        const json = await res.json();
        return json.success ? json.data : null;
    } catch (err) {
        console.warn('[Divoon] Error obteniendo mes actual:', err);
        return null;
    }
}

// Uso en UI:
// data.label        → "Diciembre 26 - Enero 26"
// data.leading      → "gato" | "pingu" | "empate" | "sin partidas"
// data.gato.wins    → 5
// data.pingu.wins   → 3
// data.totalGames   → 8
```

---

## Ejemplo de integración — histórico anual

```js
async function fetchHistory(year = null) {
    const divoonUrl = import.meta.env.VITE_DIVOON_URL;
    if (!divoonUrl) return [];

    const url = year
        ? `${divoonUrl}/games/sushigo/history?year=${year}`
        : `${divoonUrl}/games/sushigo/history`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        return json.success ? json.data.records : [];
    } catch (err) {
        console.warn('[Divoon] Error obteniendo histórico:', err);
        return [];
    }
}

// Cada record tiene:
// record.label      → "Diciembre 26 - Enero 26"
// record.winner     → "gato" | "pingu" | "empate"
// record.gato.wins  → número
// record.pingu.wins → número
// record.totalGames → número
```

---

## Resumen de responsabilidades

| Acción | Quién la hace | Cuándo |
|--------|---------------|--------|
| Registrar victoria | SushiGO | Al terminar partida Gato vs Pingu |
| Ver mes actual | Mesesaurios | Cualquier momento |
| Cerrar periodo | Mesesaurios | Día 26 (una sola vez) |
| Ver histórico | Mesesaurios | Sección de historial |
