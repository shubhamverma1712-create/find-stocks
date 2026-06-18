// ============================================================
// SMC Scanner - Webhook Server
// Glitch.me pe deploy karo - FREE hai
// ============================================================

const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Max 200 signals memory mein rakhenge
const MAX_SIGNALS = 200;
let signals = [];

// ── 1. TradingView webhook receive karta hai ──────────────────
//
// TradingView Alert Message mein ye JSON daalna:
// {
//   "symbol":  "{{ticker}}",
//   "signal":  "BUY",          // ya "SELL" / "PRE-BUY" / "PRE-SELL"
//   "price":   {{close}},
//   "sl":      {{plot_0}},     // optional - agar plot kiya ho
//   "tp":      {{plot_1}},     // optional
//   "tf":      "{{interval}}",
//   "change":  0               // TV mein directly nahi milta, 0 rakho
// }
//
app.post('/webhook', (req, res) => {
  try {
    const body = req.body;

    // Basic validation
    if (!body.symbol || !body.signal || !body.price) {
      return res.status(400).json({ error: 'symbol, signal, price required' });
    }

    const now  = new Date();
    const hh   = String(now.getHours()).padStart(2, '0');
    const mm   = String(now.getMinutes()).padStart(2, '0');

    const entry = {
      id:      Date.now(),
      symbol:  String(body.symbol).toUpperCase(),
      signal:  String(body.signal).toUpperCase(),
      type:    deriveType(String(body.signal)),
      price:   Number(body.price) || 0,
      sl:      Number(body.sl)    || 0,
      tp:      Number(body.tp)    || 0,
      change:  Number(body.change)|| 0,
      tf:      String(body.tf || ''),
      time:    `${hh}:${mm}`,
      ts:      now.toISOString(),
    };

    signals.unshift(entry);
    if (signals.length > MAX_SIGNALS) signals.pop();

    console.log(`[${entry.time}] ${entry.signal} — ${entry.symbol} @ ${entry.price}`);
    res.json({ status: 'ok', received: entry });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── 2. Dashboard fetch karta hai yahan se ────────────────────
app.get('/signals', (req, res) => {
  const since = Number(req.query.since) || 0;
  const data  = since ? signals.filter(s => s.id > since) : signals;
  res.json(data);
});

// ── 3. Purane signals clear karo ─────────────────────────────
app.delete('/signals', (req, res) => {
  signals = [];
  res.json({ status: 'cleared' });
});

// ── Helper ───────────────────────────────────────────────────
function deriveType(signal) {
  if (signal.includes('PRE') && signal.includes('BUY'))  return 'pre-buy';
  if (signal.includes('PRE') && signal.includes('SELL')) return 'pre-sell';
  if (signal.includes('BUY'))  return 'buy';
  if (signal.includes('SELL')) return 'sell';
  return 'other';
}

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMC Scanner server running on port ${PORT}`));
