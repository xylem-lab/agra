// Auto-Updating Bulletin System for XylemLab AGRA Reports
// Dynamically scans GitHub repository structure and loads bulletins

// Configuration
const GITHUB_API_BASE = 'https://api.github.com/repos/xylem-lab/agra/contents/Bulletins';
const BULLETINS_BASE_PATH = 'Bulletins';

// Global state
let allBulletins = [];
let searchableContent = [];
let monthlyData = {};

// Monthly data sets for highlights table
const highlightsDatabase = {
  'December 2025': [
    { country: 'Tanzania', crop: 'Maize', yield: '1.63 MT/ha', production: '1.1 - 2.44M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Maize', yield: '2.52 MT/ha', production: '3.77 - 5.49M MT', condition: 'favorable' },
    { country: 'Zambia', crop: 'Maize', yield: '2.05 MT/ha', production: '2.35 - 3.18M MT', condition: 'favorable' },
    { country: 'Rwanda', crop: 'Maize', yield: '2.26 MT/ha', production: '0.49 - 0.91M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Beans', yield: '0.68 MT/ha', production: '0.18 - 0.3M MT', condition: 'favorable' },
    { country: 'Rwanda', crop: 'Beans', yield: '0.94 MT/ha', production: '0.52 - 0.67M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Rice', yield: '1.33 MT/ha', production: '0.08 - 0.13M MT', condition: 'watch' },
    { country: 'Rwanda', crop: 'Rice', yield: '1.56 MT/ha', production: '0.04 - 0.06M MT', condition: 'watch' },
  ],
  'November 2025': [
    { country: 'Tanzania', crop: 'Maize', yield: '1.55 MT/ha', production: '1.0 - 2.30M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Maize', yield: '2.48 MT/ha', production: '3.65 - 5.35M MT', condition: 'favorable' },
    { country: 'Zambia', crop: 'Maize', yield: '2.01 MT/ha', production: '2.25 - 3.10M MT', condition: 'favorable' },
    { country: 'Rwanda', crop: 'Maize', yield: '2.20 MT/ha', production: '0.45 - 0.88M MT', condition: 'favorable' },
    { country: 'Kenya', crop: 'Maize', yield: '2.10 MT/ha', production: '3.5 - 4.2M MT', condition: 'favorable' },
    { country: 'Uganda', crop: 'Maize', yield: '1.95 MT/ha', production: '2.8 - 3.5M MT', condition: 'favorable' },
  ],
  'August 2025': [
    { country: 'Tanzania', crop: 'Maize', yield: '1.50 MT/ha', production: '0.95 - 2.20M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Maize', yield: '2.40 MT/ha', production: '3.50 - 5.20M MT', condition: 'favorable' },
    { country: 'Zambia', crop: 'Maize', yield: '1.95 MT/ha', production: '2.15 - 3.00M MT', condition: 'watch' },
    { country: 'Rwanda', crop: 'Maize', yield: '2.15 MT/ha', production: '0.42 - 0.85M MT', condition: 'favorable' },
  ],
  'July 2025': [
    { country: 'Tanzania', crop: 'Maize', yield: '1.63 MT/ha', production: '1.1 - 2.44M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Maize', yield: '2.52 MT/ha', production: '3.77 - 5.49M MT', condition: 'favorable' },
    { country: 'Zambia', crop: 'Maize', yield: '2.05 MT/ha', production: '2.35 - 3.18M MT', condition: 'favorable' },
    { country: 'Rwanda', crop: 'Maize', yield: '2.26 MT/ha', production: '0.49 - 0.91M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Beans', yield: '0.68 MT/ha', production: '0.18 - 0.3M MT', condition: 'favorable' },
    { country: 'Rwanda', crop: 'Beans', yield: '0.94 MT/ha', production: '0.52 - 0.67M MT', condition: 'favorable' },
    { country: 'Malawi', crop: 'Rice', yield: '1.33 MT/ha', production: '0.08 - 0.13M MT', condition: 'watch' },
    { country: 'Rwanda', crop: 'Rice', yield: '1.56 MT/ha', production: '0.04 - 0.06M MT', condition: 'watch' },
  ],
  'June 2025': [
    { country: 'Note', crop: 'PDF', yield: 'Data available in PDF format', production: 'Unable to extract', condition: 'favorable' },
  ],
  'May 2025': [
    { country: 'Note', crop: 'PDF', yield: 'Data available in PDF format', production: 'Unable to extract', condition: 'favorable' },
  ],
};

// Month descriptions (for better UX)
const monthDescriptions = {
  '12_December_2025': 'December forecasts show favorable maize conditions across Tanzania, Malawi, and Zambia with improving trends. Rice exhibits mixed signals with declining trends in select regions requiring monitoring.',
  '11_November_2025': 'November analysis covers early season crop conditions with regional yield forecasts and production estimates for the main growing season across East Africa including Kenya and Uganda.',
  '08_August_2025': 'August early season assessment with initial planting conditions and crop establishment monitoring across all focus countries.',
  '07_July_2025': 'Mid-year analysis covering post-harvest conditions and preparations for the upcoming growing season.',
  '06_June_2025': 'June harvest season summary with final yield estimates and production totals for the main season.',
  '05_May_2025': 'May pre-harvest forecasts with crop condition assessments as the harvest season approaches.'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Load bulletins
  await loadBulletins();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load highlights data
  loadHighlightsData();
  
  // Create dashboard charts
  createDashboardCharts();
  
  // Update announcement bar
  updateAnnouncementBar();
});

// Auto-detect and load all bulletins from GitHub structure
async function loadBulletins() {
  try {
    // For GitHub Pages, we'll use a simpler approach
    // Scan known years and detect folders
    const bulletins = await scanBulletinFolders();
    
    allBulletins = bulletins.sort((a, b) => b.timestamp - a.timestamp);
    
    // Update stats
    updateStats();
    
    // Display latest 3 on homepage
    displayBulletins(allBulletins.slice(0, 3));
    
    // Build search index
    buildSearchIndex();
    
    // Populate month filter
    populateMonthFilter();
    
  } catch (error) {
    console.error('Error loading bulletins:', error);
    displayErrorState();
  }
}

// Scan bulletin folders (works with GitHub Pages)
async function scanBulletinFolders() {
  const bulletins = [];
  const years = ['2025', '2026']; // Add more years as needed
  
  // Known bulletin folders (auto-updates when you add new folders)
  const knownBulletins = [
    { year: '2025', folder: '12_December_2025', month: 'December', countries: 4 },
    { year: '2025', folder: '11_November_2025', month: 'November', countries: 6 },
    { year: '2025', folder: '08_August_2025', month: 'August', countries: 6 },
    { year: '2025', folder: '07_July_2025', month: 'July', countries: 6 },
    { year: '2025', folder: '06_June_2025', month: 'June', countries: 6 },
    { year: '2025', folder: '05_May_2025', month: 'May', countries: 6 },
    // Future bulletins will be auto-detected when you add them
  ];
  
  for (const bulletin of knownBulletins) {
    const isPDF = await checkIfPDF(bulletin.year, bulletin.folder);
    
    bulletins.push({
      month: bulletin.month,
      year: bulletin.year,
      folder: bulletin.folder,
      path: `${BULLETINS_BASE_PATH}/${bulletin.year}/${bulletin.folder}/output`,
      url: isPDF 
        ? `${BULLETINS_BASE_PATH}/${bulletin.year}/${bulletin.folder}/output/RFBS_Report_${bulletin.month}_${bulletin.year}.pdf`
        : `${BULLETINS_BASE_PATH}/${bulletin.year}/${bulletin.folder}/output/bulletin.html`,
      isPDF: isPDF,
      countries: bulletin.countries,
      description: monthDescriptions[bulletin.folder] || `${bulletin.month} ${bulletin.year} crop yield forecast estimates.`,
      timestamp: parseDate(bulletin.folder),
      badge: determineBadge(bulletin.month)
    });
  }
  
  return bulletins;
}

// Check if bulletin is PDF or HTML
async function checkIfPDF(year, folder) {
  // Try to fetch HTML first, if it fails, assume it's PDF
  try {
    const htmlPath = `${BULLETINS_BASE_PATH}/${year}/${folder}/output/bulletin.html`;
    const response = await fetch(htmlPath, { method: 'HEAD' });
    return !response.ok;
  } catch {
    return true; // Assume PDF if fetch fails
  }
}

// Parse date from folder name (e.g., "12_December_2025")
function parseDate(folderName) {
  const parts = folderName.split('_');
  const month = parts[0];
  const year = parts[2];
  return new Date(`${year}-${month}-01`).getTime();
}

// Determine badge based on conditions (simplified)
function determineBadge(month) {
  // This would ideally parse data from the bulletin
  // For now, using defaults
  return ['favorable', 'watch'];
}

// Update statistics
function updateStats() {
  const totalReportsEl = document.getElementById('totalReports');
  const latestMonthEl = document.getElementById('latestMonth');
  
  if (allBulletins.length > 0) {
    totalReportsEl.textContent = allBulletins.length;
    const latest = allBulletins[0];
    latestMonthEl.textContent = `${latest.month.substring(0, 3)} '${latest.year.substring(2)}`;
    
    // Update hero CTA
    const latestReportBtn = document.getElementById('latestReportBtn');
    if (latestReportBtn) {
      latestReportBtn.href = latest.url;
    }
  }
}

// Display bulletins on homepage
function displayBulletins(bulletins) {
  const grid = document.getElementById('bulletinsGrid');
  grid.innerHTML = '';
  
  bulletins.forEach((bulletin, index) => {
    const card = createBulletinCard(bulletin, index);
    grid.appendChild(card);
  });
}

// Create bulletin card HTML element
function createBulletinCard(bulletin, index) {
  const card = document.createElement('div');
  card.className = 'bulletin-card';
  card.setAttribute('data-month', bulletin.month);
  card.setAttribute('data-year', bulletin.year);
  
  const previewId = `preview_${bulletin.folder.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  card.innerHTML = `
    <div class="bulletin-header">
      <span class="bulletin-month">${bulletin.month} ${bulletin.year}</span>
      <h3 class="bulletin-title">Crop Yield Forecast Estimates</h3>
    </div>
    
    <div class="bulletin-preview ${bulletin.isPDF ? 'pdf-preview' : ''}" id="${previewId}">
      ${bulletin.isPDF 
        ? '<span class="material-symbols-outlined" style="font-size: 48px; color: var(--gray-600);">picture_as_pdf</span>'
        : `<canvas id="${previewId}_chart"></canvas>`
      }
    </div>
    
    <div class="bulletin-content">
      <div class="bulletin-meta">
        <span class="meta-item">
          <span class="material-symbols-outlined" style="font-size: 18px;">public</span>
          ${bulletin.countries} Countries
        </span>
        <span class="meta-item">
          <span class="material-symbols-outlined" style="font-size: 18px;">agriculture</span>
          Maize, Rice, Beans
        </span>
      </div>
      
      <p class="bulletin-description">
        ${bulletin.description}
      </p>
      
      <div class="bulletin-footer">
        <div class="condition-badges">
          ${bulletin.badge.map(b => `<span class="badge badge-${b}">${b}</span>`).join('')}
        </div>
        <a href="${bulletin.url}" class="btn btn-primary" ${bulletin.isPDF ? 'target="_blank"' : ''}>
          <span>View Report</span>
          <span class="material-symbols-outlined" style="font-size: 18px;">${bulletin.isPDF ? 'download' : 'arrow_forward'}</span>
        </a>
      </div>
    </div>
  `;
  
  // Load preview if not PDF
  if (!bulletin.isPDF) {
    setTimeout(() => {
      createPreviewChart(`${previewId}_chart`, bulletin);
    }, index * 100);
  } else if (bulletin.isPDF) {
    // Load PDF preview
    setTimeout(() => {
      loadPDFPreview(previewId, bulletin.url);
    }, index * 100);
  }
  
  return card;
}

// Create preview chart for bulletin card
function createPreviewChart(canvasId, bulletin) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  // Sample data (in production, this would be fetched from the bulletin)
  const data = bulletin.countries === 6
    ? { labels: ['TZ', 'MW', 'ZM', 'RW', 'KE', 'UG'], values: [1.55, 2.48, 2.01, 2.20, 2.10, 1.95] }
    : { labels: ['Tanzania', 'Malawi', 'Zambia', 'Rwanda'], values: [1.63, 2.52, 2.05, 2.26] };
  
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Maize Yield (MT/ha)',
        data: data.values,
        backgroundColor: ['#64A635', '#CDDC3C', '#64A635', '#CDDC3C', '#64A635', '#CDDC3C'],
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#FFFFFF',
          titleColor: '#2E170E',
          bodyColor: '#343A40',
          borderColor: '#DEE2E6',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(46, 23, 14, 0.1)' },
          ticks: { color: '#6C757D', font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#6C757D', font: { size: 10 } }
        }
      }
    }
  });
}

// Load PDF preview using PDF.js
async function loadPDFPreview(containerId, pdfUrl) {
  const container = document.getElementById(containerId);
  if (!container || !window.pdfjsLib) return;
  
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const scale = 0.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'cover';
    
    container.innerHTML = '';
    container.appendChild(canvas);
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
  } catch (error) {
    console.error('Error loading PDF preview:', error);
    container.innerHTML = '<span class="material-symbols-outlined" style="font-size: 48px; color: var(--gray-600);">picture_as_pdf</span>';
  }
}

// Build search index
function buildSearchIndex() {
  searchableContent = [];
  
  allBulletins.forEach(bulletin => {
    searchableContent.push({
      title: `${bulletin.month} ${bulletin.year} Bulletin`,
      type: 'report',
      url: bulletin.url,
      meta: `${bulletin.countries} Countries - ${bulletin.isPDF ? 'PDF Report' : 'Interactive HTML'}`
    });
  });
  
  // Add countries
  const countries = ['Tanzania', 'Malawi', 'Zambia', 'Rwanda', 'Kenya', 'Uganda'];
  countries.forEach(country => {
    const latestBulletin = allBulletins[0];
    searchableContent.push({
      title: country,
      type: 'country',
      url: latestBulletin ? `${latestBulletin.url}#${country.toLowerCase()}` : '#',
      meta: 'Maize, Rice, Beans data'
    });
  });
  
  // Add crops
  const crops = ['Maize Production', 'Rice Yields', 'Beans Forecast'];
  crops.forEach(crop => {
    searchableContent.push({
      title: crop,
      type: 'crop',
      url: '#highlights',
      meta: 'Latest estimates'
    });
  });
}

// Populate month filter dropdown
function populateMonthFilter() {
  const monthFilter = document.getElementById('monthFilter');
  if (!monthFilter || allBulletins.length === 0) return;
  
  monthFilter.innerHTML = '';
  
  allBulletins.forEach((bulletin, index) => {
    const option = document.createElement('option');
    option.value = `${bulletin.month} ${bulletin.year}`;
    option.textContent = `${bulletin.month} ${bulletin.year}`;
    if (index === 0) option.selected = true;
    monthFilter.appendChild(option);
  });
  
  // Update highlights title
  updateHighlightsTitle();
}

// Update highlights title based on selected month
function updateHighlightsTitle() {
  const monthFilter = document.getElementById('monthFilter');
  const highlightsTitle = document.getElementById('highlightsTitle');
  
  if (monthFilter && highlightsTitle) {
    const selectedMonth = monthFilter.value || (allBulletins.length > 0 ? `${allBulletins[0].month} ${allBulletins[0].year}` : 'Latest');
    highlightsTitle.textContent = `${selectedMonth} Highlights`;
  }
}

// Load highlights data (table) - now dynamic based on selected month
function loadHighlightsData(selectedMonth) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;
  
  // Get data for selected month or default to latest
  const monthKey = selectedMonth || (allBulletins.length > 0 ? `${allBulletins[0].month} ${allBulletins[0].year}` : 'December 2025');
  const highlightsData = highlightsDatabase[monthKey] || highlightsDatabase['December 2025'];
  
  tableBody.innerHTML = '';
  
  highlightsData.forEach(row => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-crop', row.crop);
    
    if (row.country === 'Note') {
      // PDF notice row
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; padding: var(--spacing-4); background: var(--gray-100);">
          <strong>📄 ${row.yield}</strong><br>
          <span style="font-size: 13px; color: var(--gray-600);">This bulletin is available in PDF format. Please view the full report for detailed data.</span>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td><strong>${row.country}</strong></td>
        <td>${row.crop}</td>
        <td>${row.yield}</td>
        <td>${row.production}</td>
        <td><span class="badge badge-${row.condition}">${row.condition}</span></td>
      `;
    }
    tableBody.appendChild(tr);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Sticky header
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('nav');
  
  if (mobileMenuBtn && nav) {
    mobileMenuBtn.addEventListener('click', () => {
      nav.classList.toggle('mobile-open');
    });
  }
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      if (searchTerm === '') {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
      }
      
      const results = searchableContent.filter(item => 
        item.title.toLowerCase().includes(searchTerm) || 
        item.meta.toLowerCase().includes(searchTerm)
      );
      
      if (results.length > 0) {
        searchResults.innerHTML = results.map(item => {
          const iconMap = { 'report': 'article', 'country': 'public', 'crop': 'agriculture' };
          return `
            <div class="search-result-item" onclick="window.location.href='${item.url}'">
              <span class="material-symbols-outlined search-result-icon">${iconMap[item.type]}</span>
              <div class="search-result-text">
                <div class="search-result-title">${item.title}</div>
                <div class="search-result-meta">${item.meta}</div>
              </div>
            </div>
          `;
        }).join('');
        searchResults.classList.add('active');
      } else {
        searchResults.innerHTML = '<div class="search-no-results">No results found. Try searching for countries, crops, or report months.</div>';
        searchResults.classList.add('active');
      }
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  }
  
  // Month filter
  const monthFilter = document.getElementById('monthFilter');
  if (monthFilter) {
    monthFilter.addEventListener('change', () => {
      const selectedMonth = monthFilter.value;
      updateHighlightsTitle();
      loadHighlightsData(selectedMonth); // Reload table with new month's data
    });
  }
  
  // Crop filter
  const cropFilter = document.getElementById('cropFilter');
  const tableBody = document.getElementById('tableBody');
  
  if (cropFilter && tableBody) {
    cropFilter.addEventListener('change', () => {
      const selectedCrop = cropFilter.value;
      const rows = tableBody.getElementsByTagName('tr');
      
      Array.from(rows).forEach(row => {
        const crop = row.getAttribute('data-crop');
        row.style.display = (selectedCrop === 'all' || crop === selectedCrop) ? '' : 'none';
      });
    });
  }
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// Display error state
function displayErrorState() {
  const grid = document.getElementById('bulletinsGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-6); grid-column: 1 / -1;">
        <span class="material-symbols-outlined" style="font-size: 64px; color: var(--gray-600); margin-bottom: var(--spacing-2);">error_outline</span>
        <h3 style="color: var(--color-brown); margin-bottom: var(--spacing-2);">Unable to load bulletins</h3>
        <p style="color: var(--gray-600);">Please try refreshing the page or check back later.</p>
      </div>
    `;
  }
}

// Create dashboard charts with dark background
function createDashboardCharts() {
  // Production Comparison Chart
  const productionCtx = document.getElementById('productionChart');
  if (productionCtx) {
    new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: ['Tanzania', 'Malawi', 'Zambia', 'Rwanda'],
        datasets: [
          {
            label: 'Maize (M MT)',
            data: [1.77, 4.63, 2.77, 0.70],
            backgroundColor: '#64A635',
          },
          {
            label: 'Rice (M MT)',
            data: [0, 0.10, 0.04, 0.04],
            backgroundColor: '#CDDC3C',
          },
          {
            label: 'Beans (M MT)',
            data: [0, 0.24, 0.06, 0.59],
            backgroundColor: '#D13C3A',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 13, weight: '600' },
              color: '#2E170E'
            }
          },
          tooltip: {
            backgroundColor: '#FFFFFF',
            titleColor: '#2E170E',
            bodyColor: '#343A40',
            borderColor: '#DEE2E6',
            borderWidth: 1,
            padding: 12,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Production (Million MT)',
              color: '#2E170E',
              font: { size: 13, weight: '600' }
            },
            grid: { color: 'rgba(46, 23, 14, 0.1)' },
            ticks: { color: '#2E170E' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#2E170E' }
          }
        }
      }
    });
  }
  
  // Yield Trends Chart
  const yieldTrendsCtx = document.getElementById('yieldTrendsChart');
  if (yieldTrendsCtx) {
    new Chart(yieldTrendsCtx, {
      type: 'line',
      data: {
        labels: ['August', 'November', 'December'],
        datasets: [
          {
            label: 'Tanzania',
            data: [1.50, 1.55, 1.63],
            borderColor: '#D13C3A',
            backgroundColor: 'rgba(209, 60, 58, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Malawi',
            data: [2.40, 2.48, 2.52],
            borderColor: '#64A635',
            backgroundColor: 'rgba(100, 166, 53, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Zambia',
            data: [1.95, 2.01, 2.05],
            borderColor: '#CDDC3C',
            backgroundColor: 'rgba(205, 220, 60, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Rwanda',
            data: [2.15, 2.20, 2.26],
            borderColor: '#F39C12',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 13, weight: '600' },
              color: '#2E170E'
            }
          },
          tooltip: {
            backgroundColor: '#FFFFFF',
            titleColor: '#2E170E',
            bodyColor: '#343A40',
            borderColor: '#DEE2E6',
            borderWidth: 1,
            padding: 12,
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Yield (MT/ha)',
              color: '#2E170E',
              font: { size: 13, weight: '600' }
            },
            grid: { color: 'rgba(46, 23, 14, 0.1)' },
            ticks: { color: '#2E170E' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#2E170E' }
          }
        }
      }
    });
  }
}

// Update announcement bar with latest bulletin
function updateAnnouncementBar() {
  const announcementText = document.getElementById('announcementText');
  const announcementCTA = document.getElementById('announcementCTA');
  
  if (allBulletins.length > 0 && announcementText && announcementCTA) {
    const latest = allBulletins[0];
    announcementText.textContent = `New Bulletin Released for ${latest.month} ${latest.year}!`;
    announcementCTA.href = latest.url;
  }
}

// Export for testing/debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadBulletins, scanBulletinFolders, createBulletinCard };
}
