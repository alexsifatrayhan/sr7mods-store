/**
 * SR7MODS STORE - Core Application Engine
 * Implements database fetch, local persistence, search indexing, responsive filtering,
 * pagination (max 20 per page), dynamic burger menu, and infinite loop carousel.
 */

// Global state
let storeDB = null;
let currentCategory = 'all';
let searchQuery = '';
let currentPage = 1;
const itemsPerPage = 20;

// Carousel drag state
let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let carouselTimer = null;
let currentCarouselIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
});

// Main initialization
async function initializeApp() {
  storeDB = await fetchDatabase();
  setupGlobalNavigation();
  renderSidebarCategories();
  
  // Check what page we are on
  const isAppDetailPage = window.location.pathname.endsWith('app.html') || window.location.search.includes('pkg=');
  
  if (isAppDetailPage && document.getElementById('app-detail-container')) {
    renderAppDetails();
  } else if (document.getElementById('main-app-grid')) {
    renderMainPage();
  }

  // Update dynamic elements
  updateStoreConfigUI();
}

// Fetch database with localStorage persistence as dynamic CRUD state
async function fetchDatabase() {
  let localData = localStorage.getItem('sr7_storedetails');
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Error parsing localStorage storedetails', e);
    }
  }

  // Fallback to fetching file
  try {
    const response = await fetch('./storedetails.json');
    if (response.ok) {
      const dataText = await response.text();
      localStorage.setItem('sr7_storedetails', dataText);
      return JSON.parse(dataText);
    }
  } catch (error) {
    console.error('Could not fetch storedetails.json from host', error);
  }

  // Final emergency fallback if even that fails
  const emergencyFallback = {
    config: { store_name: "SR7MODS STORE", about_url: "https://alexsifatrayhan.github.io/about-me/" },
    categories: [{ id: "tools", name: "Tools & Utilities" }],
    recommended_apps: [],
    app_list: []
  };
  localStorage.setItem('sr7_storedetails', JSON.stringify(emergencyFallback));
  return emergencyFallback;
}

// Update general meta attributes from config
function updateStoreConfigUI() {
  if (!storeDB || !storeDB.config) return;
  const storeNameText = storeDB.config.store_name || "SR7MODS STORE";
  
  // Update header text titles if they exist
  const storeTitles = document.querySelectorAll('.store-title-header');
  storeTitles.forEach(el => {
    el.textContent = storeNameText;
  });

  // Update title element of document
  document.title = storeNameText;
}

// Global Nav & Sidebar controllers
function setupGlobalNavigation() {
  const burgerBtn = document.getElementById('burger-menu-btn');
  const sidebar = document.getElementById('sidebar-nav');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  
  // Burger Menu toggle
  if (burgerBtn && sidebar && sidebarOverlay) {
    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.contains('translate-x-0');
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    // Close on overlay click
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Clicking outer triggers sidebar retraction
  document.addEventListener('click', (e) => {
    if (sidebar && !sidebar.contains(e.target) && burgerBtn && !burgerBtn.contains(e.target)) {
      if (sidebar.classList.contains('translate-x-0')) {
        closeSidebar();
      }
    }
  });

  // Home logo clicking redirects
  const homeTitle = document.getElementById('header-home-link');
  if (homeTitle) {
    homeTitle.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'index.html';
    });
  }

  const aboutLink = document.getElementById('header-about-link');
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = storeDB?.config?.about_url || 'https://alexsifatrayhan.github.io/about-me/';
      window.location.href = targetUrl;
    });
  }

  // Sidebar link clicks (Home and About)
  const sidebarHome = document.getElementById('sidebar-home-link');
  if (sidebarHome) {
    sidebarHome.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      window.location.href = 'index.html';
    });
  }

  const sidebarAbout = document.getElementById('sidebar-about-link');
  if (sidebarAbout) {
    sidebarAbout.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      const targetUrl = storeDB?.config?.about_url || 'https://alexsifatrayhan.github.io/about-me/';
      window.location.href = targetUrl;
    });
  }

  // Interactive Expanding Search Input
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.classList.toggle('w-0');
      searchInput.classList.toggle('w-48');
      searchInput.classList.toggle('opacity-0');
      searchInput.classList.toggle('px-3');
      searchInput.focus();
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1;
      renderAppGrid();
    });

    searchInput.addEventListener('click', (e) => e.stopPropagation());
  }
}

function openSidebar() {
  const burgerBtn = document.getElementById('burger-menu-btn');
  const sidebar = document.getElementById('sidebar-nav');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (sidebar && sidebarOverlay && burgerBtn) {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    sidebarOverlay.classList.remove('hidden', 'pointer-events-none');
    sidebarOverlay.classList.add('opacity-100');
    burgerBtn.classList.add('sidebar-open');
  }
}

function closeSidebar() {
  const burgerBtn = document.getElementById('burger-menu-btn');
  const sidebar = document.getElementById('sidebar-nav');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (sidebar && sidebarOverlay && burgerBtn) {
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    sidebarOverlay.classList.remove('opacity-100');
    sidebarOverlay.classList.add('hidden', 'pointer-events-none');
    burgerBtn.classList.remove('sidebar-open');
  }
}

// Render the category accordion panel in sidebar
function renderSidebarCategories() {
  const accordionContainer = document.getElementById('sidebar-categories-accordion');
  if (!accordionContainer || !storeDB) return;

  const listContainer = document.getElementById('sidebar-categories-list');
  if (!listContainer) return;

  // Render Category Links
  let listHtml = `
    <li>
      <a href="#" class="category-filter-btn block py-1.5 px-3 rounded text-sm transition-all text-cyan-300 font-mono hover:bg-cyan-500/10" data-cat="all">
        [ALL SYSTEMS]
      </a>
    </li>
  `;

  storeDB.categories.forEach(cat => {
    listHtml += `
      <li>
        <a href="#" class="category-filter-btn block py-1.5 px-3 rounded text-sm transition-all text-gray-400 hover:text-cyan-400 font-mono hover:bg-cyan-500/10" data-cat="${cat.id}">
          // ${cat.name.toUpperCase()}
        </a>
      </li>
    `;
  });

  listContainer.innerHTML = listHtml;

  // Setup accordion click toggle
  const header = accordionContainer.querySelector('.accordion-header');
  header.addEventListener('click', () => {
    accordionContainer.classList.toggle('accordion-active');
  });

  // Attach dynamic filter triggers
  listContainer.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.getAttribute('data-cat');
      currentCategory = cat;
      currentPage = 1;
      
      // Update visual style in sidebar
      listContainer.querySelectorAll('.category-filter-btn').forEach(b => {
        b.classList.remove('text-cyan-300', 'bg-cyan-500/10');
        b.classList.add('text-gray-400');
      });
      btn.classList.add('text-cyan-300', 'bg-cyan-500/10');
      btn.classList.remove('text-gray-400');

      // Filter and close
      closeSidebar();
      renderAppGrid();
      
      // Scroll to app list
      const mainSection = document.getElementById('main-store-section');
      if (mainSection) {
        mainSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Home Page rendering
function renderMainPage() {
  renderRecommendedCarousel();
  renderAppGrid();
}

// Render dynamic loop carousel for Recommended Apps
function renderRecommendedCarousel() {
  const container = document.getElementById('recommended-carousel-container');
  const track = document.getElementById('recommended-carousel-track');
  if (!container || !track || !storeDB) return;

  // Clear track
  track.innerHTML = '';

  // Filter app_list to find actual recommended app entities matching pkg codes
  const recommendedPkgs = storeDB.recommended_apps || [];
  const recommendedApps = storeDB.app_list.filter(app => recommendedPkgs.includes(app.pkg));

  if (recommendedApps.length === 0) {
    container.style.display = 'none';
    return;
  }

  // To build an infinite loop carousel, we can append duplicates
  // Let's create duplicates to cover left and right scrolling bounds cleanly
  const duplicates = [...recommendedApps, ...recommendedApps, ...recommendedApps];

  duplicates.forEach((app, index) => {
    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-full md:w-1/2 p-3';
    
    // Choose dynamic color glow bloom depending on index or category
    let colorGlowClass = 'glow-card-cyan';
    let labelColor = 'text-cyan-400';
    if (app.category === 'gaming') {
      colorGlowClass = 'glow-card-pink';
      labelColor = 'text-pink-400';
    } else if (app.category === 'media') {
      colorGlowClass = 'glow-card-green';
      labelColor = 'text-emerald-400';
    }

    const firstModFeature = app.mod_features?.[0] || 'Premium Unlocked';

    card.innerHTML = `
      <div class="glass-panel hover:border-cyan-500/30 ${colorGlowClass} p-5 rounded-2xl flex items-center gap-4 cursor-pointer h-full transition-all duration-300" onclick="window.location.href='app.html?pkg=${app.pkg}'">
        <img src="${app.icon}" alt="${app.name}" class="w-16 h-16 rounded-xl object-cover border border-white/10" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80'">
        <div class="overflow-hidden flex-1">
          <span class="text-[10px] tracking-wider uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 font-mono">${app.category.toUpperCase()}</span>
          <h3 class="font-display text-xl font-bold text-white mt-1 leading-tight truncate">${app.name}</h3>
          <p class="text-xs ${labelColor} font-semibold mt-0.5 truncate font-mono">⚡ MOD: ${firstModFeature}</p>
        </div>
      </div>
    `;
    track.appendChild(card);
  });

  // Carousel slider animation logic
  let transitionWidth = container.offsetWidth;
  let itemsCount = recommendedApps.length;
  currentCarouselIndex = itemsCount; // start in the middle copy

  const updatePosition = (smooth = true) => {
    const cardWidth = track.children[0].offsetWidth;
    const translateVal = -(currentCarouselIndex * cardWidth);
    track.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
    track.style.transform = `translateX(${translateVal}px)`;
  };

  // Adjust on resize
  window.addEventListener('resize', () => {
    updatePosition(false);
  });

  // Auto scroll right-to-left, pause 2 seconds
  const startAutoScroll = () => {
    stopAutoScroll();
    carouselTimer = setInterval(() => {
      currentCarouselIndex++;
      updatePosition(true);

      // Reset to middle silently if we reach end duplicates
      setTimeout(() => {
        if (currentCarouselIndex >= itemsCount * 2) {
          currentCarouselIndex = itemsCount;
          updatePosition(false);
        }
      }, 500);
    }, 2500);
  };

  const stopAutoScroll = () => {
    if (carouselTimer) clearInterval(carouselTimer);
  };

  // Drag / swipe handlers
  track.addEventListener('mousedown', (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.pageX - track.offsetLeft;
    scrollLeft = currentCarouselIndex;
    track.style.transition = 'none';
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    const cardWidth = track.children[0].offsetWidth;
    // Round position to nearest card
    currentCarouselIndex = Math.round(currentCarouselIndex);
    updatePosition(true);
    startAutoScroll();
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) / track.children[0].offsetWidth;
    currentCarouselIndex = scrollLeft - walk;
    track.style.transform = `translateX(${-currentCarouselIndex * track.children[0].offsetWidth}px)`;
  });

  // Touch support for mobile
  track.addEventListener('touchstart', (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.touches[0].pageX - track.offsetLeft;
    scrollLeft = currentCarouselIndex;
    track.style.transition = 'none';
  });

  track.addEventListener('touchend', () => {
    isDragging = false;
    currentCarouselIndex = Math.round(currentCarouselIndex);
    updatePosition(true);
    startAutoScroll();
  });

  track.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - track.offsetLeft;
    const walk = (x - startX) / track.children[0].offsetWidth;
    currentCarouselIndex = scrollLeft - walk;
    track.style.transform = `translateX(${-currentCarouselIndex * track.children[0].offsetWidth}px)`;
  });

  // Initial setup and trigger
  setTimeout(() => {
    updatePosition(false);
    startAutoScroll();
  }, 100);
}

// Render dynamic grid list
function renderAppGrid() {
  const gridContainer = document.getElementById('main-app-grid');
  const countDisplay = document.getElementById('grid-results-count');
  if (!gridContainer || !storeDB) return;

  gridContainer.innerHTML = '';

  // Apply filters
  let filteredList = storeDB.app_list || [];

  // 1. Category Filter
  if (currentCategory !== 'all') {
    filteredList = filteredList.filter(app => app.category === currentCategory);
  }

  // 2. Search Query Filter (Title or package name match)
  if (searchQuery) {
    filteredList = filteredList.filter(app => 
      app.name.toLowerCase().includes(searchQuery) || 
      app.pkg.toLowerCase().includes(searchQuery)
    );
  }

  // Show result counts
  if (countDisplay) {
    countDisplay.textContent = `Found ${filteredList.length} systems`;
  }

  if (filteredList.length === 0) {
    gridContainer.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <p class="text-rose-500 font-mono text-lg uppercase tracking-wider">[ INTRUSION ERROR: NO CORRESPONDING APPLICATIONS FOUND ]</p>
        <p class="text-sm text-gray-400 mt-2">Adjust your decryption keys or query constraints</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  // Handle Pagination (Limit 20 apps per page)
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Slice current page items
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pagedList = filteredList.slice(startIdx, endIdx);

  // Render cards
  pagedList.forEach(app => {
    const card = document.createElement('div');
    card.className = 'glass-card-interactive p-4 rounded-xl flex flex-col justify-between cursor-pointer';
    card.setAttribute('id', `app-card-${app.pkg}`);
    card.setAttribute('onclick', `window.location.href='app.html?pkg=${app.pkg}'`);

    // Get features limit 3
    const featuresHtml = app.mod_features.slice(0, 3).map(feat => `
      <li class="flex items-start gap-1.5 text-xs text-gray-300">
        <span class="text-cyan-400 font-mono mt-0.5">⚡</span>
        <span class="truncate">${feat}</span>
      </li>
    `).join('');

    card.innerHTML = `
      <div>
        <div class="flex items-center gap-3 mb-3">
          <img src="${app.icon}" alt="${app.name}" class="w-12 h-12 rounded-lg object-cover border border-white/5" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80'">
          <div class="overflow-hidden">
            <h3 class="font-display font-bold text-lg text-white leading-tight truncate">${app.name}</h3>
            <span class="text-[9px] tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono">${app.category.toUpperCase()}</span>
          </div>
        </div>
        
        <ul class="space-y-1 mb-4">
          ${featuresHtml}
          ${app.mod_features.length > 3 ? `<li class="text-[10px] text-gray-400 font-mono ml-4">+ ${app.mod_features.length - 3} additional modifications</li>` : ''}
        </ul>
      </div>

      <div class="border-t border-white/5 pt-2 flex justify-between items-center text-[10px] text-gray-400 font-mono">
        <span>By: ${app.creator || 'Unknown'}</span>
        <span class="text-cyan-400 font-semibold">${app.version}</span>
      </div>
    `;
    gridContainer.appendChild(card);
  });

  renderPagination(totalPages);
}

// Render numeric page numbers and action button triggers
function renderPagination(totalPages) {
  const container = document.getElementById('grid-pagination');
  if (!container) return;

  container.innerHTML = '';
  if (totalPages <= 1) return;

  // Render left arrow
  const prevBtn = document.createElement('button');
  prevBtn.className = `px-3 py-1.5 rounded font-mono text-xs ${currentPage === 1 ? 'opacity-40 cursor-not-allowed text-gray-500' : 'text-cyan-400 hover:bg-cyan-500/10'}`;
  prevBtn.innerHTML = '&lt; PREV';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderAppGrid();
      window.scrollTo({ top: document.getElementById('main-store-section').offsetTop - 20, behavior: 'smooth' });
    }
  });
  container.appendChild(prevBtn);

  // Numeric page controllers
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `w-8 h-8 rounded font-mono text-xs transition-all ${currentPage === i ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,242,254,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderAppGrid();
      window.scrollTo({ top: document.getElementById('main-store-section').offsetTop - 20, behavior: 'smooth' });
    });
    container.appendChild(pageBtn);
  }

  // Render right arrow
  const nextBtn = document.createElement('button');
  nextBtn.className = `px-3 py-1.5 rounded font-mono text-xs ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed text-gray-500' : 'text-cyan-400 hover:bg-cyan-500/10'}`;
  nextBtn.innerHTML = 'NEXT &gt;';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderAppGrid();
      window.scrollTo({ top: document.getElementById('main-store-section').offsetTop - 20, behavior: 'smooth' });
    }
  });
  container.appendChild(nextBtn);
}

// Render details about a selected application inside app.html template
function renderAppDetails() {
  const container = document.getElementById('app-detail-container');
  if (!container || !storeDB) return;

  // Retrieve package parameter ?pkg=...
  const urlParams = new URLSearchParams(window.location.search);
  const pkgName = urlParams.get('pkg');

  if (!pkgName) {
    container.innerHTML = `
      <div class="glass-panel p-8 text-center rounded-2xl">
        <h2 class="font-display text-2xl font-bold text-rose-500 mb-2">[ CRITICAL WARNING: NO PACKAGE HASH SUPPLIED ]</h2>
        <p class="text-sm text-gray-400 mb-4">Please return to index repository to resolve package queries</p>
        <a href="index.html" class="btn-primary px-6 py-2 rounded-xl inline-block">RETURN HOME</a>
      </div>
    `;
    return;
  }

  const app = storeDB.app_list.find(item => item.pkg === pkgName);

  if (!app) {
    container.innerHTML = `
      <div class="glass-panel p-8 text-center rounded-2xl">
        <h2 class="font-display text-2xl font-bold text-rose-500 mb-2">[ SYSTEM FAILURE: PACKAGE INDEX NOT MATCHED ]</h2>
        <p class="text-sm text-gray-400 mb-4">The module reference ${pkgName} is empty or unauthorized.</p>
        <a href="index.html" class="btn-primary px-6 py-2 rounded-xl inline-block">RETURN HOME</a>
      </div>
    `;
    return;
  }

  // Map category displays
  const categoryName = storeDB.categories.find(c => c.id === app.category)?.name || app.category;

  // Generate Store Reference SVG / Link
  let storeLogoSvg = '';
  if (app.store_ref?.logo_type === 'play_store') {
    storeLogoSvg = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M5.25 3H16.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm11.25 1.5H5.25A1.5 1.5 0 0 0 3.75 6v12a1.5 1.5 0 0 0 1.5 1.5H16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5zM12 9.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5z"/></svg>`;
  } else if (app.store_ref?.logo_type === 'f_droid') {
    storeLogoSvg = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
  } else {
    storeLogoSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>`;
  }

  // Compile Features
  const featuresList = app.mod_features.map(feat => `
    <li class="flex items-start gap-2 text-sm text-gray-300">
      <span class="text-cyan-400 font-mono">⚡</span>
      <span>${feat}</span>
    </li>
  `).join('');

  // Compile Download buttons
  const downloadButtons = app.download_links.map(link => `
    <a href="${link.url}" target="_blank" class="btn-primary w-full text-center py-3.5 px-6 rounded-xl font-display text-lg font-bold tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
      ${link.name.toUpperCase()}
    </a>
  `).join('');

  container.innerHTML = `
    <!-- Top Back Arrow -->
    <div class="mb-6">
      <a href="index.html" class="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5 transition-all">
        &lt;= Back to Systems
      </a>
    </div>

    <!-- Core App Meta & Layout Box -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Primary Card Sidebar (App Details Meta) -->
      <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between h-fit gap-6 lg:col-span-1">
        <div class="text-center">
          <img src="${app.icon}" alt="${app.name}" class="w-28 h-28 mx-auto rounded-3xl object-cover border border-white/10 shadow-[0_0_20px_rgba(0,242,254,0.15)] mb-4" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80'">
          <h1 class="font-display text-3xl font-bold text-white leading-tight mb-2">${app.name}</h1>
          <p class="text-xs text-gray-400 font-mono mb-4">${app.pkg}</p>
          
          <div class="flex flex-wrap gap-2 justify-center">
            <span class="text-[10px] tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">${categoryName.toUpperCase()}</span>
            <span class="text-[10px] tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono">${app.version}</span>
          </div>
        </div>

        <div class="border-t border-white/10 pt-4 space-y-3 font-mono text-xs text-gray-400">
          <div class="flex justify-between">
            <span>MODIFIED BY:</span>
            <span class="text-white font-semibold">${app.modder}</span>
          </div>
          <div class="flex justify-between">
            <span>DEVELOPER:</span>
            <span class="text-white font-semibold">${app.creator}</span>
          </div>
          ${app.store_ref?.url ? `
          <div class="flex justify-between items-center">
            <span>OFFICIAL SOURCE:</span>
            <a href="${app.store_ref.url}" target="_blank" class="inline-flex items-center gap-1 text-cyan-400 hover:underline">
              ${storeLogoSvg}
              <span>${app.store_ref.display_name}</span>
            </a>
          </div>
          ` : ''}
        </div>

        <div class="space-y-3">
          <h3 class="font-display font-bold text-gray-400 tracking-wider text-xs uppercase border-b border-white/5 pb-1">DOWNLOAD TERMINAL</h3>
          <div class="flex flex-col gap-2">
            ${downloadButtons}
          </div>
        </div>
      </div>

      <!-- Main app specification context (Description & Mod details) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- MOD FEATURES APPENDER BOX -->
        <div class="glass-panel p-6 rounded-2xl">
          <h2 class="font-display text-xl font-bold text-cyan-300 uppercase tracking-wide border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
            <span>⚡</span> CYBER-MODIFICATIONS COMPILER
          </h2>
          <ul class="space-y-3">
            ${featuresList}
          </ul>
        </div>

        <!-- APP DESCRIPTION RAW HTML PARSED -->
        <div class="glass-panel p-6 rounded-2xl">
          <h2 class="font-display text-xl font-bold text-gray-300 uppercase tracking-wide border-b border-white/10 pb-2 mb-4">
            SPECIFICATION OVERVIEW
          </h2>
          <div class="prose prose-invert text-gray-300 space-y-3 text-sm leading-relaxed">
            ${app.description}
          </div>
        </div>
      </div>

    </div>
  `;
}
