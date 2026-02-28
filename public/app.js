// ─── State ────────────────────────────────────────────────────────────────────
let allStocks = [];
let direction = 'above'; // 'above' | 'below' | 'both'
let minDeviation = 2;

// ─── Direction toggle ─────────────────────────────────────────────────────────
function setDirection(dir) {
    direction = dir;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active', 'green-active', 'red-active');
    });
    const active = document.getElementById(
        dir === 'above' ? 'btnAbove' : dir === 'below' ? 'btnBelow' : 'btnBoth'
    );
    active.classList.add('active');
    if (dir === 'above') active.classList.add('green-active');
    else if (dir === 'below') active.classList.add('red-active');

    renderTable();
}

// ─── Slider / input sync ─────────────────────────────────────────────────────
function onSliderChange(val) {
    minDeviation = parseFloat(val) || 0;
    document.getElementById('deviationInput').value = minDeviation;
    document.getElementById('deviationLabel').textContent = minDeviation.toFixed(1) + '%';
    renderTable();
}

function onInputChange(val) {
    const v = Math.max(0, parseFloat(val) || 0);
    minDeviation = v;
    document.getElementById('deviationSlider').value = Math.min(v, 20);
    document.getElementById('deviationLabel').textContent = v.toFixed(1) + '%';
    renderTable();
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmt(n) {
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sparkline canvas renderer ───────────────────────────────────────────────
function drawSparkline(canvas, prices, isPositive) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!prices || prices.length < 2) return;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const pts = prices.map((p, i) => ({
        x: (i / (prices.length - 1)) * W,
        y: H - ((p - min) / range) * (H - 4) - 2,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (isPositive) {
        grad.addColorStop(0, 'rgba(34,211,165,0.3)');
        grad.addColorStop(1, 'rgba(34,211,165,0)');
    } else {
        grad.addColorStop(0, 'rgba(245,84,108,0.3)');
        grad.addColorStop(1, 'rgba(245,84,108,0)');
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        const cp1x = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        const cp1x = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = isPositive ? '#22d3a5' : '#f5546c';
    ctx.lineWidth = 1.8;
    ctx.stroke();
}

// ─── Render table ─────────────────────────────────────────────────────────────
function renderTable() {
    if (allStocks.length === 0) return;

    const filtered = allStocks.filter(s => {
        const absDev = Math.abs(s.deviationPct);
        if (absDev < minDeviation) return false;
        if (direction === 'above') return s.deviationPct > 0;
        if (direction === 'below') return s.deviationPct < 0;
        return true; // both
    });

    // Sort by absolute deviation descending
    filtered.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));

    // Update stats
    const aboveCount = allStocks.filter(s => s.deviationPct > 0).length;
    const belowCount = allStocks.filter(s => s.deviationPct < 0).length;
    document.getElementById('statCount').textContent = filtered.length;
    document.getElementById('statAbove').textContent = aboveCount;
    document.getElementById('statBelow').textContent = belowCount;
    document.getElementById('statTotal').textContent = allStocks.length;

    const tbody = document.getElementById('stocksTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('stocksTable');

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        table.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    table.classList.remove('hidden');

    tbody.innerHTML = '';
    filtered.forEach((stock, idx) => {
        const isPos = stock.deviationPct >= 0;
        const devSign = isPos ? '+' : '';
        const devClass = isPos ? 'positive' : 'negative';
        const devArrow = isPos ? '▲' : '▼';

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td class="td-rank">${idx + 1}</td>
      <td class="td-symbol">
        <div class="stock-name">${stock.symbol}</div>
        <div class="stock-long-name">${stock.longName}</div>
      </td>
      <td class="td-price">₹${fmt(stock.currentPrice)}</td>
      <td class="td-ema">₹${fmt(stock.ema20)}</td>
      <td class="td-dev">
        <span class="dev-badge ${devClass}">
          ${devArrow} ${devSign}${stock.deviationPct.toFixed(2)}%
        </span>
      </td>
      <td class="td-spark">
        <canvas class="sparkline" width="100" height="36" data-idx="${idx}"></canvas>
      </td>
    `;
        tbody.appendChild(tr);

        // Draw sparkline after DOM insert
        requestAnimationFrame(() => {
            const canvas = tr.querySelector('canvas.sparkline');
            if (canvas) drawSparkline(canvas, stock.sparkline, isPos);
        });
    });
}

// ─── Load data from server ────────────────────────────────────────────────────
async function loadData() {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const tableWrapper = document.getElementById('tableWrapper');
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const progressEl = document.getElementById('loadingProgress');

    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    tableWrapper.classList.add('hidden');
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spinning');

    // Countdown hint
    let secs = 60;
    const countdown = setInterval(() => {
        secs--;
        progressEl.textContent = secs > 0 ? `Estimated wait: ~${secs}s` : 'Almost there…';
    }, 1000);

    try {
        const res = await fetch('/api/stocks');
        clearInterval(countdown);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();

        allStocks = data.stocks || [];

        if (allStocks.length === 0) {
            throw new Error('No stock data received. Yahoo Finance may be rate-limiting.');
        }

        // Update last-updated timestamp
        const fetchedAt = new Date(data.fetchedAt);
        document.getElementById('lastUpdated').textContent =
            `Updated ${fetchedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

        loadingState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');
        renderTable();

        // Log errors if any symbols failed
        if (data.errors?.length) {
            console.warn('Failed symbols:', data.errors);
        }
    } catch (err) {
        clearInterval(countdown);
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        document.getElementById('errorText').textContent = err.message;
        console.error('Load error:', err);
    } finally {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
    }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Initialise button state
    setDirection('above');
    loadData();
});
