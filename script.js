// ===== DOM Elements =====
const fromCurrency = document.getElementById('from-currency');
const toCurrency = document.getElementById('to-currency');
const amountInput = document.getElementById('amount');
const convertBtn = document.getElementById('convert-btn');
const swapBtn = document.getElementById('swap-btn');
const resultArea = document.getElementById('result-area');
const resultMain = document.getElementById('result-main');
const resultDetail = document.getElementById('result-detail');
const errorMessage = document.getElementById('error-message');
const ratesTagsContainer = document.getElementById('rates-tags');
const chartSection = document.getElementById('chart-section');
const chartContainer = document.getElementById('chart-container');
const chartLoading = document.getElementById('chart-loading');
const chartTitle = document.getElementById('chart-title');
const chartRangeBtns = document.getElementById('chart-range-btns');
const rateChartCanvas = document.getElementById('rate-chart');

const RATES_API = 'https://open.er-api.com/v6/latest';
const HISTORY_API = 'https://api.frankfurter.dev/v1';

// ===== Currency metadata =====
const currencyMeta = {
  AED: { flag: '🇦🇪', name: 'UAE Dirham' },
  AUD: { flag: '🇦🇺', name: 'Australian Dollar' },
  BGN: { flag: '🇧🇬', name: 'Bulgarian Lev' },
  BRL: { flag: '🇧🇷', name: 'Brazilian Real' },
  CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
  CHF: { flag: '🇨🇭', name: 'Swiss Franc' },
  CNY: { flag: '🇨🇳', name: 'Chinese Yuan' },
  CZK: { flag: '🇨🇿', name: 'Czech Koruna' },
  DKK: { flag: '🇩🇰', name: 'Danish Krone' },
  EGP: { flag: '🇪🇬', name: 'Egyptian Pound' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  HKD: { flag: '🇭🇰', name: 'Hong Kong Dollar' },
  HUF: { flag: '🇭🇺', name: 'Hungarian Forint' },
  IDR: { flag: '🇮🇩', name: 'Indonesian Rupiah' },
  ILS: { flag: '🇮🇱', name: 'Israeli Shekel' },
  INR: { flag: '🇮🇳', name: 'Indian Rupee' },
  ISK: { flag: '🇮🇸', name: 'Icelandic Króna' },
  JPY: { flag: '🇯🇵', name: 'Japanese Yen' },
  KRW: { flag: '🇰🇷', name: 'South Korean Won' },
  MXN: { flag: '🇲🇽', name: 'Mexican Peso' },
  MYR: { flag: '🇲🇾', name: 'Malaysian Ringgit' },
  NOK: { flag: '🇳🇴', name: 'Norwegian Krone' },
  NZD: { flag: '🇳🇿', name: 'New Zealand Dollar' },
  PHP: { flag: '🇵🇭', name: 'Philippine Peso' },
  PKR: { flag: '🇵🇰', name: 'Pakistani Rupee' },
  PLN: { flag: '🇵🇱', name: 'Polish Złoty' },
  RON: { flag: '🇷🇴', name: 'Romanian Leu' },
  RUB: { flag: '🇷🇺', name: 'Russian Ruble' },
  SAR: { flag: '🇸🇦', name: 'Saudi Riyal' },
  SEK: { flag: '🇸🇪', name: 'Swedish Krona' },
  SGD: { flag: '🇸🇬', name: 'Singapore Dollar' },
  THB: { flag: '🇹🇭', name: 'Thai Baht' },
  TRY: { flag: '🇹🇷', name: 'Turkish Lira' },
  TWD: { flag: '🇹🇼', name: 'Taiwan Dollar' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  ZAR: { flag: '🇿🇦', name: 'South African Rand' },
};

const supportedCurrencies = Object.keys(currencyMeta).sort();

// ===== Popular conversion pairs =====
const popularPairs = [
  { from: 'USD', to: 'EUR' },
  { from: 'SGD', to: 'INR' },
  { from: 'EUR', to: 'INR' },
  { from: 'INR', to: 'JPY' },
  { from: 'CHF', to: 'INR' },
  { from: 'AUD', to: 'INR' },
  { from: 'CHF', to: 'USD' },
  { from: 'NZD', to: 'INR' },
];

// Rate cache
let ratesCache = {};
const CACHE_DURATION = 60 * 60 * 1000;

// Chart instance
let rateChart = null;
let currentRange = '1M';

// ===== Populate Dropdowns =====
function populateCurrencies() {
  [fromCurrency, toCurrency].forEach((select) => {
    select.innerHTML = '';
    supportedCurrencies.forEach((code) => {
      const meta = currencyMeta[code];
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${meta.flag} ${code} — ${meta.name}`;
      select.appendChild(option);
    });
  });
  fromCurrency.value = 'USD';
  toCurrency.value = 'INR';
}

// ===== Fetch live rates =====
async function fetchRates(base) {
  const cached = ratesCache[base];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates;
  }

  const res = await fetch(`${RATES_API}/${base}`);
  if (!res.ok) throw new Error('Failed to fetch rates');
  const data = await res.json();
  if (data.result !== 'success') throw new Error('API error');

  ratesCache[base] = { rates: data.rates, timestamp: Date.now() };
  return data.rates;
}

// ===== Render Popular Tags =====
function renderPopularTags() {
  ratesTagsContainer.innerHTML = '';
  popularPairs.forEach((pair) => {
    const tag = document.createElement('button');
    tag.className = 'rate-tag';
    const fm = currencyMeta[pair.from];
    const tm = currencyMeta[pair.to];
    tag.textContent = `${fm.flag} ${pair.from} → ${tm.flag} ${pair.to}`;
    tag.addEventListener('click', () => {
      fromCurrency.value = pair.from;
      toCurrency.value = pair.to;
      if (amountInput.value) {
        convertCurrency();
      }
    });
    ratesTagsContainer.appendChild(tag);
  });
}

// ===== Convert Currency =====
async function convertCurrency() {
  const amount = parseFloat(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!amount || amount <= 0) {
    showError('Please enter a valid amount greater than 0.');
    hideResult();
    return;
  }
  if (from === to) {
    showError('Please select two different currencies.');
    hideResult();
    return;
  }

  hideError();
  setLoading(true);

  try {
    const rates = await fetchRates(from);
    const rate = rates[to];
    if (!rate) throw new Error(`Rate not found for ${to}`);

    const converted = amount * rate;
    const fm = currencyMeta[from];
    const tm = currencyMeta[to];

    resultMain.textContent = `${tm.flag} ${formatNumber(converted)} ${to}`;
    resultDetail.innerHTML = `
      <span>${fm.flag} ${formatNumber(amount)} ${from} = ${tm.flag} ${formatNumber(converted)} ${to}</span>
      <div class="rate-info">1 ${from} = ${rate.toFixed(6)} ${to}</div>
    `;

    showResult();
    // Show and load chart
    loadChart(from, to, currentRange);
  } catch (err) {
    showError('Conversion failed. Please try again.');
    hideResult();
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ===== Chart Logic =====
function getDateRange(range) {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '1D':
      start.setDate(end.getDate() - 1);
      break;
    case '1W':
      start.setDate(end.getDate() - 7);
      break;
    case '1M':
      start.setMonth(end.getMonth() - 1);
      break;
    case '1Y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case '5Y':
      start.setFullYear(end.getFullYear() - 5);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

async function loadChart(from, to, range) {
  chartSection.classList.add('visible');
  chartLoading.style.display = 'flex';
  chartContainer.style.display = 'none';

  const fm = currencyMeta[from];
  const tm = currencyMeta[to];
  chartTitle.textContent = `${fm.flag} ${from} → ${tm.flag} ${to}`;

  // Update active range button
  chartRangeBtns.querySelectorAll('.range-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.range === range);
  });

  try {
    const { start, end } = getDateRange(range);
    const url = `${HISTORY_API}/${start}..${end}?from=${from}&to=${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Chart data fetch failed');
    const data = await res.json();

    const dates = Object.keys(data.rates).sort();
    const values = dates.map((d) => data.rates[d][to]);

    if (dates.length === 0) {
      chartLoading.innerHTML = '<span style="color: var(--text-muted);">No data available for this range</span>';
      return;
    }

    renderChart(dates, values, from, to);
    chartLoading.style.display = 'none';
    chartContainer.style.display = 'block';
  } catch (err) {
    chartLoading.innerHTML = '<span style="color: var(--text-muted);">Unable to load chart data</span>';
    console.error(err);
  }
}

function renderChart(labels, data, from, to) {
  if (rateChart) {
    rateChart.destroy();
  }

  const ctx = rateChartCanvas.getContext('2d');

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(129, 199, 245, 0.12)');
  gradient.addColorStop(1, 'rgba(129, 199, 245, 0.0)');

  // Format labels based on data density
  const formatLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (labels.length <= 10) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (labels.length <= 60) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  rateChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.map(formatLabel),
      datasets: [
        {
          data: data,
          borderColor: 'rgba(129, 199, 245, 0.8)',
          backgroundColor: gradient,
          borderWidth: 1.8,
          fill: true,
          tension: 0.35,
          pointRadius: labels.length <= 14 ? 3 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: 'rgba(129, 199, 245, 0.9)',
          pointBorderColor: 'transparent',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(129, 199, 245, 0.9)',
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 20, 30, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleColor: 'rgba(255, 255, 255, 0.6)',
          bodyColor: 'rgba(255, 255, 255, 0.9)',
          titleFont: { family: 'Inter', size: 11 },
          bodyFont: { family: 'Inter', size: 13, weight: '600' },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function (ctx) {
              return `1 ${from} = ${ctx.parsed.y.toFixed(4)} ${to}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: 'Inter', size: 10 },
            maxTicksLimit: 6,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: 'Inter', size: 10 },
            maxTicksLimit: 5,
          },
          border: { display: false },
        },
      },
    },
  });
}

// ===== Range Button Listeners =====
chartRangeBtns.addEventListener('click', (e) => {
  if (!e.target.classList.contains('range-btn')) return;
  const range = e.target.dataset.range;
  currentRange = range;
  const from = fromCurrency.value;
  const to = toCurrency.value;
  if (from !== to) {
    loadChart(from, to, range);
  }
});

// ===== Swap Currencies =====
function swapCurrencies() {
  const temp = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = temp;
  if (amountInput.value && resultArea.classList.contains('visible')) {
    convertCurrency();
  }
}

// ===== Utility =====
function formatNumber(num) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

function showResult() { resultArea.classList.add('visible'); }
function hideResult() {
  resultArea.classList.remove('visible');
  chartSection.classList.remove('visible');
}
function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.add('visible');
}
function hideError() { errorMessage.classList.remove('visible'); }

function setLoading(loading) {
  if (loading) {
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<span class="spinner"></span>Converting...';
  } else {
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert';
  }
}

// ===== Event Listeners =====
convertBtn.addEventListener('click', convertCurrency);
swapBtn.addEventListener('click', swapCurrencies);
amountInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') convertCurrency();
});

// ===== Init =====
async function init() {
  populateCurrencies();
  renderPopularTags();
  
  // Fetch initial rates in background to warm cache
  try {
    await fetchRates('USD');
  } catch (e) {
    console.warn('Initial rates fetch failed', e);
  }

  // Artificial delay for splash screen effect (min 1 second)
  setTimeout(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      splashScreen.classList.add('hidden');
    }
  }, 1000);
}

init();
