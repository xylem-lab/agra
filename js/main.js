// Auto-Updating Bulletin System — driven by manifest.json
// To add a new bulletin: update manifest.json only. No code changes needed.

const MANIFEST_URL = 'manifest.json';
const BULLETINS_BASE = 'Bulletins';

let allBulletins = [];
let manifest = null;
let searchableContent = [];

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  manifest = await fetchManifest();
  if (!manifest) { displayErrorState(); return; }

  applyDynamicAssets(manifest);
  allBulletins = await buildBulletinList(manifest.bulletins);

  updateStats();
  displayBulletins(allBulletins.slice(0, 3));
  buildSearchIndex();
  populateMonthFilter();
  loadHighlightsData();
  createDashboardCharts();
  updateAnnouncementBar();
  setupEventListeners();
});

// ── Manifest ─────────────────────────────────────────────────────────────────
async function fetchManifest() {
  try {
    const res = await fetch(MANIFEST_URL + '?_=' + Date.now());
    if (!res.ok) throw new Error('manifest not found');
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch manifest.json:', e);
    return null;
  }
}

// ── Build bulletin objects ────────────────────────────────────────────────────
async function buildBulletinList(entries) {
  const bulletins = [];
  for (const entry of entries) {
    const htmlPath = `${BULLETINS_BASE}/${entry.year}/${entry.folder}/output/bulletin.html`;
    const pdfPath  = `${BULLETINS_BASE}/${entry.year}/${entry.folder}/output/RFBS_Report_${entry.month}_${entry.year}.pdf`;
    const hasHTML  = await checkIfHTML(htmlPath);

    bulletins.push({
      month:         entry.month,
      year:          entry.year,
      folder:        entry.folder,
      countries:     entry.countries,
      countriesList: entry.countriesList || [],
      description:   entry.description || `${entry.month} ${entry.year} crop yield forecast estimates.`,
      highlights:    entry.highlights   || [],
      chartData:     entry.chartData    || null,
      url:   hasHTML ? htmlPath : pdfPath,
      isPDF: !hasHTML,
      timestamp: parseDate(entry.folder),
    });
  }
  return bulletins.sort((a, b) => b.timestamp - a.timestamp);
}

async function checkIfHTML(path) {
  try { const r = await fetch(path, { method: 'HEAD' }); return r.ok; }
  catch { return false; }
}

function parseDate(folder) {
  const p = folder.split('_');
  return new Date(`${p[2]}-${p[0].padStart(2,'0')}-01`).getTime();
}

// ── Dynamic static assets ────────────────────────────────────────────────────
function applyDynamicAssets(manifest) {
  const base = manifest.staticAssetsBase;
  if (!base) return;
  const logo    = document.querySelector('header .logo');
  const favicon = document.querySelector('link[rel="icon"]');
  const banner  = document.querySelector('.partner-logos img');
  if (logo)    logo.src    = `${base}/XylemLab%20logo.png`;
  if (favicon) favicon.href = `${base}/XylemLab%20logo.png`;
  if (banner)  banner.src  = `${base}/AGRA_Banner.png`;
}

// ── Stats cards ───────────────────────────────────────────────────────────────
function updateStats() {
  const totalEl   = document.getElementById('totalReports');
  const monthEl   = document.getElementById('latestMonth');
  const latestBtn = document.getElementById('latestReportBtn');
  const latest    = allBulletins[0];
  if (totalEl) totalEl.setAttribute('data-target', allBulletins.length);
  if (monthEl && latest) monthEl.textContent = `${latest.month.substring(0,3)} '${latest.year.substring(2)}`;
  if (latestBtn && latest) latestBtn.href = latest.url;
}

// ── Bulletin cards ────────────────────────────────────────────────────────────
function displayBulletins(bulletins) {
  const grid = document.getElementById('bulletinsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  bulletins.forEach((b, i) => grid.appendChild(createBulletinCard(b, i)));
}

function createBulletinCard(bulletin, index) {
  const card      = document.createElement('div');
  card.className  = 'bulletin-card';
  const previewId = `preview_${bulletin.folder.replace(/[^a-zA-Z0-9]/g,'_')}`;
  const chartId   = `${previewId}_chart`;

  card.innerHTML = `
    <div class="bulletin-header">
      <span class="bulletin-month">${bulletin.month} ${bulletin.year}</span>
      <h3 class="bulletin-title">Crop Yield Forecast Estimates</h3>
    </div>
    <div class="bulletin-preview ${bulletin.isPDF ? 'pdf-preview' : ''}" id="${previewId}">
      ${bulletin.isPDF
        ? '<span class="material-symbols-outlined" style="font-size:48px;color:var(--gray-600);">picture_as_pdf</span>'
        : `<canvas id="${chartId}"></canvas>`}
    </div>
    <div class="bulletin-content">
      <div class="bulletin-meta">
        <span class="meta-item">
          <span class="material-symbols-outlined" style="font-size:18px;">public</span>
          ${bulletin.countries} Countries
        </span>
        <span class="meta-item">
          <span class="material-symbols-outlined" style="font-size:18px;">agriculture</span>
          Maize, Rice, Beans
        </span>
      </div>
      <p class="bulletin-description">${bulletin.description}</p>
      <div class="bulletin-footer">
        <div class="condition-badges">
          <span class="badge badge-favorable">Favorable</span>
          <span class="badge badge-watch">Watch</span>
        </div>
        <a href="${bulletin.url}" class="btn btn-primary" ${bulletin.isPDF ? 'target="_blank"' : ''}>
          <span>View Report</span>
          <span class="material-symbols-outlined" style="font-size:18px;">${bulletin.isPDF ? 'download' : 'arrow_forward'}</span>
        </a>
      </div>
    </div>`;

  setTimeout(() => {
    if (!bulletin.isPDF && bulletin.chartData) createPreviewChart(chartId, bulletin);
    else if (!bulletin.isPDF)                  createGenericPreviewChart(chartId, bulletin);
    else                                        loadPDFPreview(previewId, bulletin.url);
  }, index * 80);

  return card;
}

function createPreviewChart(canvasId, bulletin) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !bulletin.chartData) return;
  const { countries, maizeYields } = bulletin.chartData;
  new Chart(canvas, {
    type: 'bar',
    data: { labels: countries, datasets: [{ label: 'Maize Yield (MT/ha)', data: maizeYields,
      backgroundColor: countries.map((_,i) => i%2===0 ? '#64A635' : '#CDDC3C'), borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { color:'#6C757D', font:{size:10} }, grid:{color:'rgba(46,23,14,0.1)'} },
                x: { grid:{display:false}, ticks:{color:'#6C757D', font:{size:10}} } } }
  });
}

function createGenericPreviewChart(canvasId, bulletin) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const labels = bulletin.countriesList.length
    ? bulletin.countriesList.map(c => c.split(' ').pop())
    : ['—'];
  const values = labels.map(() => +(1.5 + Math.random()).toFixed(2));
  new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Maize Yield (MT/ha)', data: values,
      backgroundColor: labels.map((_,i) => i%2===0 ? '#64A635' : '#CDDC3C'), borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks:{color:'#6C757D',font:{size:10}} },
                x: { grid:{display:false}, ticks:{color:'#6C757D',font:{size:10}} } } }
  });
}

async function loadPDFPreview(containerId, pdfUrl) {
  const container = document.getElementById(containerId);
  if (!container || !window.pdfjsLib) return;
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf  = await pdfjsLib.getDocument(pdfUrl).promise;
    const page = await pdf.getPage(1);
    const vp   = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.height = vp.height; canvas.width = vp.width;
    canvas.style.width = canvas.style.height = '100%';
    canvas.style.objectFit = 'cover';
    container.innerHTML = '';
    container.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  } catch {
    container.innerHTML = '<span class="material-symbols-outlined" style="font-size:48px;color:var(--gray-600);">picture_as_pdf</span>';
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
function buildSearchIndex() {
  searchableContent = [];
  const countries = new Set();
  allBulletins.forEach(b => {
    searchableContent.push({ title: `${b.month} ${b.year} Bulletin`, type: 'report', url: b.url,
      meta: `${b.countries} Countries — ${b.isPDF ? 'PDF' : 'Interactive HTML'}` });
    b.countriesList.forEach(c => countries.add(c));
  });
  const latest = allBulletins[0];
  countries.forEach(c => searchableContent.push({ title: c, type: 'country',
    url: latest ? `${latest.url}#${c.toLowerCase().replace(/\s+/g,'-')}` : '#', meta: 'Maize, Rice, Beans data' }));
  ['Maize Production','Rice Yields','Beans Forecast'].forEach(crop =>
    searchableContent.push({ title: crop, type: 'crop', url: '#highlights', meta: 'Latest estimates' }));
}

// ── Highlights table ──────────────────────────────────────────────────────────
function populateMonthFilter() {
  const sel = document.getElementById('monthFilter');
  if (!sel) return;
  sel.innerHTML = '';
  allBulletins.forEach((b, i) => {
    const opt = document.createElement('option');
    opt.value = `${b.month} ${b.year}`;
    opt.textContent = opt.value;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  });
  updateHighlightsTitle();
}

function updateHighlightsTitle() {
  const sel   = document.getElementById('monthFilter');
  const title = document.getElementById('highlightsTitle');
  if (sel && title) title.textContent = `${sel.value} Highlights`;
}

function loadHighlightsData(selectedMonth) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;
  const key = selectedMonth || (allBulletins[0] ? `${allBulletins[0].month} ${allBulletins[0].year}` : '');
  const bulletin = allBulletins.find(b => `${b.month} ${b.year}` === key) || allBulletins[0];
  const rows = bulletin?.highlights || [];
  tableBody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-crop', row.crop);
    if (row.country === 'Note') {
      tr.innerHTML = `<td colspan="5" style="text-align:center;padding:var(--spacing-4);background:var(--gray-100);">
        <strong>📄 ${row.yield}</strong><br>
        <span style="font-size:13px;color:var(--gray-600);">This bulletin is in PDF format. View the full report for detailed data.</span>
      </td>`;
    } else {
      tr.innerHTML = `
        <td><strong>${row.country}</strong></td>
        <td>${row.crop}</td>
        <td>${row.yield}</td>
        <td>${row.production}</td>
        <td><span class="badge badge-${row.condition}">${row.condition}</span></td>`;
    }
    tableBody.appendChild(tr);
  });
}

// ── Dashboard charts ──────────────────────────────────────────────────────────
function createDashboardCharts() {
  const latest = allBulletins[0];

  // Production by country — latest bulletin
  const prodCtx = document.getElementById('productionChart');
  if (prodCtx && latest) {
    const cardTitle = prodCtx.closest('.dashboard-card')?.querySelector('.dashboard-card-title');
    if (cardTitle) cardTitle.textContent = `Production by Country (${latest.month} ${latest.year})`;

    const byCountry = {};
    (latest.highlights || []).forEach(h => {
      if (h.country === 'Note') return;
      if (!byCountry[h.country]) byCountry[h.country] = { Maize:0, Beans:0, Rice:0 };
      byCountry[h.country][h.crop] = parseMidProduction(h.production);
    });
    const countries = Object.keys(byCountry);
    new Chart(prodCtx, {
      type: 'bar',
      data: { labels: countries, datasets: [
        { label: 'Maize (M MT)', data: countries.map(c => byCountry[c].Maize || 0), backgroundColor: '#64A635' },
        { label: 'Rice (M MT)',  data: countries.map(c => byCountry[c].Rice  || 0), backgroundColor: '#CDDC3C' },
        { label: 'Beans (M MT)', data: countries.map(c => byCountry[c].Beans || 0), backgroundColor: '#D13C3A' }
      ]},
      options: chartOptions('Production (Million MT)')
    });
  }

  // Maize yield trends across all bulletins with chartData
  const trendCtx = document.getElementById('yieldTrendsChart');
  if (trendCtx) {
    const trendBulletins = allBulletins.filter(b => b.chartData).slice(0, 6).reverse();
    const labels = trendBulletins.map(b => b.month.substring(0,3) + " '" + b.year.substring(2));
    const allC   = [...new Set(trendBulletins.flatMap(b => b.chartData.countries))];
    const colors = ['#D13C3A','#64A635','#CDDC3C','#F39C12','#3498DB','#9B59B6'];
    new Chart(trendCtx, {
      type: 'line',
      data: { labels, datasets: allC.map((c, i) => ({
        label: c,
        data: trendBulletins.map(b => { const idx = b.chartData.countries.indexOf(c); return idx>=0 ? b.chartData.maizeYields[idx] : null; }),
        borderColor: colors[i%colors.length], backgroundColor: colors[i%colors.length]+'18',
        tension: 0.4, borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, spanGaps: true
      }))},
      options: chartOptions('Yield (MT/ha)', false)
    });
  }
}

function parseMidProduction(str) {
  const nums = (str || '').match(/[\d.]+/g);
  if (!nums || nums.length < 2) return 0;
  return (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
}

function chartOptions(yLabel, beginAtZero = true) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position:'bottom', labels:{ padding:15, font:{size:13,weight:'600'}, color:'#2E170E' } },
      tooltip: { backgroundColor:'#FFFFFF', titleColor:'#2E170E', bodyColor:'#343A40', borderColor:'#DEE2E6', borderWidth:1, padding:12 }
    },
    scales: {
      y: { beginAtZero, title:{display:true,text:yLabel,color:'#2E170E',font:{size:13,weight:'600'}},
           grid:{color:'rgba(46,23,14,0.1)'}, ticks:{color:'#2E170E'} },
      x: { grid:{display:false}, ticks:{color:'#2E170E'} }
    }
  };
}

// ── Announcement bar ──────────────────────────────────────────────────────────
function updateAnnouncementBar() {
  const text   = document.getElementById('announcementText');
  const cta    = document.getElementById('announcementCTA');
  const bar    = document.getElementById('announcementBar');
  const latest = allBulletins[0];
  if (latest && text) text.textContent = `New Bulletin Released for ${latest.month} ${latest.year}!`;
  if (latest && cta)  cta.href = latest.url;

  const closeBtn = document.getElementById('closeAnnouncement');
  if (closeBtn && bar) {
    if (localStorage.getItem('announcementClosed') === latest?.folder) bar.style.display = 'none';
    closeBtn.addEventListener('click', () => {
      bar.style.display = 'none';
      localStorage.setItem('announcementClosed', latest?.folder || '');
    });
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 20));

  const mobileBtn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('nav');
  mobileBtn?.addEventListener('click', () => nav?.classList.toggle('mobile-open'));

  const searchInput   = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const iconMap = { report:'article', country:'public', crop:'agriculture' };
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', e => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) { searchResults.classList.remove('active'); searchResults.innerHTML=''; return; }
      const hits = searchableContent.filter(i => i.title.toLowerCase().includes(term) || i.meta.toLowerCase().includes(term));
      searchResults.innerHTML = hits.length
        ? hits.map(i => `<div class="search-result-item" onclick="window.location.href='${i.url}'">
            <span class="material-symbols-outlined search-result-icon">${iconMap[i.type]}</span>
            <div class="search-result-text">
              <div class="search-result-title">${i.title}</div>
              <div class="search-result-meta">${i.meta}</div>
            </div></div>`).join('')
        : '<div class="search-no-results">No results found. Try countries, crops, or report months.</div>';
      searchResults.classList.add('active');
    });
    document.addEventListener('click', e => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target))
        searchResults.classList.remove('active');
    });
  }

  const monthFilter = document.getElementById('monthFilter');
  monthFilter?.addEventListener('change', () => { updateHighlightsTitle(); loadHighlightsData(monthFilter.value); });

  const cropFilter = document.getElementById('cropFilter');
  const tableBody  = document.getElementById('tableBody');
  cropFilter?.addEventListener('change', () => {
    const crop = cropFilter.value;
    Array.from(tableBody?.getElementsByTagName('tr') || []).forEach(row => {
      row.style.display = (crop==='all' || row.getAttribute('data-crop')===crop) ? '' : 'none';
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  });

  // Count-up animation when stats section enters viewport
  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.stat-value[data-target]').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        if (!isNaN(target)) animateValue(el, 0, target, 1500);
      });
      statsObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  const statsSection = document.querySelector('.stats-section');
  if (statsSection) statsObserver.observe(statsSection);
}

function animateValue(el, start, end, duration) {
  let t0 = null;
  const step = ts => {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / duration, 1);
    el.textContent = Math.floor(p * (end - start) + start);
    if (p < 1) requestAnimationFrame(step); else el.textContent = end;
  };
  requestAnimationFrame(step);
}

function displayErrorState() {
  const grid = document.getElementById('bulletinsGrid');
  if (grid) grid.innerHTML = `
    <div style="text-align:center;padding:var(--spacing-6);grid-column:1/-1;">
      <span class="material-symbols-outlined" style="font-size:64px;color:var(--gray-600);margin-bottom:var(--spacing-2);">error_outline</span>
      <h3 style="color:var(--color-brown);margin-bottom:var(--spacing-2);">Unable to load bulletins</h3>
      <p style="color:var(--gray-600);">Please try refreshing the page or check back later.</p>
    </div>`;
}
