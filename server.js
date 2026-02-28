const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Nifty 200 symbols (Yahoo Finance suffix: .NS for NSE)
const NIFTY200_SYMBOLS = [
  '360ONE.NS', 'ABB.NS', 'ACC.NS', 'APLAPOLLO.NS', 'AUBANK.NS', 'ADANIENSOL.NS', 'ADANIENT.NS', 'ADANIGREEN.NS', 'ADANIPORTS.NS', 'ADANIPOWER.NS', 'ATGL.NS', 'ABCAPITAL.NS', 'ALKEM.NS', 'AMBUJACEM.NS', 'APOLLOHOSP.NS', 'ASHOKLEY.NS', 'ASIANPAINT.NS', 'ASTRAL.NS', 'AUROPHARMA.NS', 'DMART.NS', 'AXISBANK.NS', 'BSE.NS', 'BAJAJ-AUTO.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'BAJAJHLDNG.NS', 'BAJAJHFL.NS', 'BANKBARODA.NS', 'BANKINDIA.NS', 'BDL.NS', 'BEL.NS', 'BHARATFORG.NS', 'BHEL.NS', 'BPCL.NS', 'BHARTIARTL.NS', 'BHARTIHEXA.NS', 'BIOCON.NS', 'BLUESTARCO.NS', 'BOSCHLTD.NS', 'BRITANNIA.NS', 'CGPOWER.NS', 'CANBK.NS', 'CHOLAFIN.NS', 'CIPLA.NS', 'COALINDIA.NS', 'COCHINSHIP.NS', 'COFORGE.NS', 'COLPAL.NS', 'CONCOR.NS', 'COROMANDEL.NS', 'CUMMINSIND.NS', 'DLF.NS', 'DABUR.NS', 'DIVISLAB.NS', 'DIXON.NS', 'DRREDDY.NS', 'EICHERMOT.NS', 'ETERNAL.NS', 'EXIDEIND.NS', 'NYKAA.NS', 'FEDERALBNK.NS', 'FORTIS.NS', 'GAIL.NS', 'GMRAIRPORT.NS', 'GLENMARK.NS', 'GODFRYPHLP.NS', 'GODREJCP.NS', 'GODREJPROP.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCAMC.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS', 'HAVELLS.NS', 'HEROMOTOCO.NS', 'HINDALCO.NS', 'HAL.NS', 'HINDPETRO.NS', 'HINDUNILVR.NS', 'HINDZINC.NS', 'POWERINDIA.NS', 'HUDCO.NS', 'HYUNDAI.NS', 'ICICIBANK.NS', 'ICICIGI.NS', 'IDFCFIRSTB.NS', 'IRB.NS', 'ITCHOTELS.NS', 'ITC.NS', 'INDIANB.NS', 'INDHOTEL.NS', 'IOC.NS', 'IRCTC.NS', 'IRFC.NS', 'IREDA.NS', 'IGL.NS', 'INDUSTOWER.NS', 'INDUSINDBK.NS', 'NAUKRI.NS', 'INFY.NS', 'INDIGO.NS', 'JSWENERGY.NS', 'JSWSTEEL.NS', 'JINDALSTEL.NS', 'JIOFIN.NS', 'JUBLFOOD.NS', 'KEI.NS', 'KPITTECH.NS', 'KALYANKJIL.NS', 'KOTAKBANK.NS', 'LTF.NS', 'LICHSGFIN.NS', 'LTM.NS', 'LT.NS', 'LICI.NS', 'LODHA.NS', 'LUPIN.NS', 'MRF.NS', 'M&MFIN.NS', 'M&M.NS', 'MANKIND.NS', 'MARICO.NS', 'MARUTI.NS', 'MFSL.NS', 'MAXHEALTH.NS', 'MAZDOCK.NS', 'MOTILALOFS.NS', 'MPHASIS.NS', 'MUTHOOTFIN.NS', 'NHPC.NS', 'NMDC.NS', 'NTPCGREEN.NS', 'NTPC.NS', 'NATIONALUM.NS', 'NESTLEIND.NS', 'OBEROIRLTY.NS', 'ONGC.NS', 'OIL.NS', 'PAYTM.NS', 'OFSS.NS', 'POLICYBZR.NS', 'PIIND.NS', 'PAGEIND.NS', 'PATANJALI.NS', 'PERSISTENT.NS', 'PHOENIXLTD.NS', 'PIDILITIND.NS', 'POLYCAB.NS', 'PFC.NS', 'POWERGRID.NS', 'PREMIERENE.NS', 'PRESTIGE.NS', 'PNB.NS', 'RECLTD.NS', 'RVNL.NS', 'RELIANCE.NS', 'SBICARD.NS', 'SBILIFE.NS', 'SRF.NS', 'MOTHERSON.NS', 'SHREECEM.NS', 'SHRIRAMFIN.NS', 'ENRIN.NS', 'SIEMENS.NS', 'SOLARINDS.NS', 'SONACOMS.NS', 'SBIN.NS', 'SAIL.NS', 'SUNPHARMA.NS', 'SUPREMEIND.NS', 'SUZLON.NS', 'SWIGGY.NS', 'TVSMOTOR.NS', 'TATACOMM.NS', 'TCS.NS', 'TATACONSUM.NS', 'TATAELXSI.NS', 'TMPV.NS', 'TATAPOWER.NS', 'TATASTEEL.NS', 'TATATECH.NS', 'TECHM.NS', 'TITAN.NS', 'TORNTPHARM.NS', 'TORNTPOWER.NS', 'TRENT.NS', 'TIINDIA.NS', 'UPL.NS', 'ULTRACEMCO.NS', 'UNIONBANK.NS', 'UNITDSPR.NS', 'VBL.NS', 'VEDL.NS', 'VMM.NS', 'IDEA.NS', 'VOLTAS.NS', 'WAAREEENER.NS', 'WIPRO.NS', 'YESBANK.NS', 'ZYDUSLIFE.NS'
];

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Calculate EMA
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

// Fetch data for a single symbol from Yahoo Finance
async function fetchStockData(symbol) {
  const range = '3mo';
  const interval = '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${symbol}`);

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const closes = result.indicators?.quote?.[0]?.close?.filter(p => p != null) || [];
  const timestamps = result.timestamp || [];
  const meta = result.meta || {};

  if (closes.length < 20) throw new Error(`Insufficient data for ${symbol}`);

  const ema20 = calculateEMA(closes, 20);
  const currentPrice = closes[closes.length - 1];
  const deviationPct = ((currentPrice - ema20) / ema20) * 100;

  // Last 30 price points for sparkline
  const sparkline = closes.slice(-30);

  return {
    symbol: symbol.replace('.NS', ''),
    fullSymbol: symbol,
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    ema20: parseFloat(ema20.toFixed(2)),
    deviationPct: parseFloat(deviationPct.toFixed(2)),
    sparkline,
    currency: meta.currency || 'INR',
    longName: meta.longName || symbol.replace('.NS', ''),
  };
}

// API endpoint: fetch all Nifty 200 stocks
app.get('/api/stocks', async (req, res) => {
  const results = [];
  const errors = [];

  // Fetch all symbols concurrently in batches of 10 to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < NIFTY200_SYMBOLS.length; i += batchSize) {
    const batch = NIFTY200_SYMBOLS.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fetchStockData));
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({ symbol: batch[idx], error: result.reason?.message });
      }
    });
    // Small delay between batches to be polite to the API
    if (i + batchSize < NIFTY200_SYMBOLS.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  res.json({
    stocks: results,
    errors,
    fetchedAt: new Date().toISOString(),
    totalFetched: results.length,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Nifty 200 EMA20 Filter running at http://localhost:${PORT}\n`);
});
