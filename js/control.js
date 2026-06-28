/**
 * SR7MODS STORE - Control Panel & Dynamic CMS Engine
 * Implements full CRUD operations, category managers, app injectors, HTML visual parsers,
 * and JSON modifications download payloads.
 */

let controlDB = null;
let editingAppPkg = null; // null if adding, pkg if editing

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify Authentication Bypass state
  verifyAuth();
  
  // 2. Load Database
  controlDB = await fetchDatabaseForControl();
  
  // 3. Initialize Control Dashboard UI
  initControlUI();
});

function verifyAuth() {
  const token = localStorage.getItem('sr7_admin_session');
  if (token !== 'authenticated_token_99812_sr7mods') {
    alert('SECURE TERMINAL WARNING: UNAUTHORIZED BYPASS DECRYPTION DETECTED. RETURNING TO PUBLIC MAIN.');
    window.location.href = 'index.html';
  }
}

async function fetchDatabaseForControl() {
  let localData = localStorage.getItem('sr7_storedetails');
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback
  try {
    const res = await fetch('./storedetails.json');
    if (res.ok) {
      const dataText = await res.text();
      localStorage.setItem('sr7_storedetails', dataText);
      return JSON.parse(dataText);
    }
  } catch (error) {
    console.error(error);
  }

  return {
    config: { store_name: "SR7MODS STORE", about_url: "https://alexsifatrayhan.github.io/about-me/" },
    categories: [],
    recommended_apps: [],
    app_list: []
  };
}

// Save back to localStorage and trigger payload generator
function saveDatabaseState() {
  localStorage.setItem('sr7_storedetails', JSON.stringify(controlDB, null, 2));
  renderJsonPayload();
  // Refresh standard grid and tables
  renderAppsTable();
  renderCategoriesControl();
  renderRecommendedCheckboxes();
  updateSelectors();
}

function initControlUI() {
  // Logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('sr7_admin_session');
      window.location.href = 'index.html';
    });
  }

  // Reset Database to static file
  const resetBtn = document.getElementById('reset-db-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('Are you absolutely sure you want to reset the database to the initial storedetails.json static content? This will overwrite all custom browser changes.')) {
        localStorage.removeItem('sr7_storedetails');
        controlDB = await fetchDatabaseForControl();
        saveDatabaseState();
        alert('Database restored successfully!');
      }
    });
  }

  // Setup Config Modifier forms
  setupConfigModifier();

  // Setup Category CRUD
  setupCategoryCRUD();

  // Setup App Add / Edit Forms
  setupAppFormHandler();

  // Initial renders
  renderAppsTable();
  renderCategoriesControl();
  renderRecommendedCheckboxes();
  renderJsonPayload();
}

// 1. CONFIG METADATA MODIFIER
function setupConfigModifier() {
  const storeNameInput = document.getElementById('config-store-name');
  const aboutUrlInput = document.getElementById('config-about-url');
  const saveConfigBtn = document.getElementById('save-config-btn');

  if (!storeNameInput || !aboutUrlInput || !saveConfigBtn) return;

  // Set values
  storeNameInput.value = controlDB.config?.store_name || '';
  aboutUrlInput.value = controlDB.config?.about_url || '';

  saveConfigBtn.addEventListener('click', (e) => {
    e.preventDefault();
    controlDB.config.store_name = storeNameInput.value.trim() || 'SR7MODS STORE';
    controlDB.config.about_url = aboutUrlInput.value.trim() || 'https://alexsifatrayhan.github.io/about-me/';
    saveDatabaseState();
    
    // Toast notification style
    showToast('Global Store Meta configuration updated!');
  });
}

// 2. CATEGORY CRUD MANAGER
function setupCategoryCRUD() {
  const addBtn = document.getElementById('add-cat-btn');
  const catNameInput = document.getElementById('new-cat-name');
  const catIdInput = document.getElementById('new-cat-id');

  if (!addBtn || !catNameInput || !catIdInput) return;

  addBtn.addEventListener('click', () => {
    const name = catNameInput.value.trim();
    const id = catIdInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!name || !id) {
      alert('Please provide valid Category Name and unique ID values.');
      return;
    }

    // Check duplicate ID
    if (controlDB.categories.some(c => c.id === id)) {
      alert('A category with this ID already exists.');
      return;
    }

    controlDB.categories.push({ id, name });
    saveDatabaseState();

    catNameInput.value = '';
    catIdInput.value = '';
    showToast(`Category [${name}] created!`);
  });
}

function renderCategoriesControl() {
  const listContainer = document.getElementById('categories-control-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (controlDB.categories.length === 0) {
    listContainer.innerHTML = `<p class="text-xs text-gray-500 font-mono">No active categories found.</p>`;
    return;
  }

  controlDB.categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-lg hover:border-cyan-500/20 transition-all mb-2';
    
    // Count apps in this category
    const appCount = controlDB.app_list.filter(a => a.category === cat.id).length;

    row.innerHTML = `
      <div class="font-mono text-sm">
        <span class="text-white font-semibold">${cat.name}</span>
        <span class="text-cyan-400 text-xs ml-2">(${cat.id})</span>
        <span class="text-gray-500 text-xs ml-2">[${appCount} apps]</span>
      </div>
      <div class="flex gap-2">
        <button class="edit-cat-btn text-xs text-cyan-400 hover:text-white bg-cyan-950/20 px-2 py-1 rounded border border-cyan-500/10" data-id="${cat.id}">RENAME</button>
        <button class="delete-cat-btn text-xs text-rose-400 hover:text-white bg-rose-950/20 px-2 py-1 rounded border border-rose-500/10" data-id="${cat.id}">DELETE</button>
      </div>
    `;

    // Edit Name logic
    row.querySelector('.edit-cat-btn').addEventListener('click', () => {
      const newName = prompt(`Enter new display name for category [${cat.name}]:`, cat.name);
      if (newName && newName.trim()) {
        cat.name = newName.trim();
        saveDatabaseState();
        showToast('Category renamed successfully.');
      }
    });

    // Cascade Delete logic
    row.querySelector('.delete-cat-btn').addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete category [${cat.name}]? This will execute a cascade action: all applications registered in this category will be modified or removed.`)) {
        // Cascade delete category
        controlDB.categories = controlDB.categories.filter(c => c.id !== cat.id);
        
        // Remove or reassign apps
        const initialCount = controlDB.app_list.length;
        controlDB.app_list = controlDB.app_list.filter(a => a.category !== cat.id);
        const removedCount = initialCount - controlDB.app_list.length;

        saveDatabaseState();
        showToast(`Deleted category [${cat.name}] and purged ${removedCount} cascade applications.`);
      }
    });

    listContainer.appendChild(row);
  });
}

// 3. COMPREHENSIVE APP ADDER/EDITOR TEMPLATE
let tempFeatures = [];
let tempDownloads = [];

function setupAppFormHandler() {
  const showModalBtn = document.getElementById('show-app-modal-btn');
  const modal = document.getElementById('app-editor-modal');
  const closeModalBtn = document.getElementById('close-app-modal-btn');
  const appForm = document.getElementById('app-crud-form');
  
  // Feature handlers
  const addFeatureBtn = document.getElementById('add-feature-btn');
  const featureInput = document.getElementById('feature-input');
  
  // Download handlers
  const addDownloadBtn = document.getElementById('add-download-btn');
  const downloadNameInput = document.getElementById('download-name-input');
  const downloadUrlInput = document.getElementById('download-url-input');

  if (!showModalBtn || !modal || !closeModalBtn || !appForm) return;

  // Open modal for Adding a new app
  showModalBtn.addEventListener('click', () => {
    openAppModalFor(null);
  });

  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    editingAppPkg = null;
  });

  // Feature Append / Row Injectors
  addFeatureBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = featureInput.value.trim();
    if (text) {
      tempFeatures.push(text);
      featureInput.value = '';
      renderTempFeatures();
    }
  });

  // Download Row Injectors
  addDownloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = downloadNameInput.value.trim();
    const url = downloadUrlInput.value.trim();
    if (name && url) {
      tempDownloads.push({ name, url });
      downloadNameInput.value = '';
      downloadUrlInput.value = '';
      renderTempDownloads();
    }
  });

  // Handle Main Submit App Saving
  appForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const pkg = document.getElementById('app-pkg').value.trim();
    const name = document.getElementById('app-name').value.trim();
    const icon = document.getElementById('app-icon').value.trim();
    const version = document.getElementById('app-version').value.trim();
    const category = document.getElementById('app-category-select').value;
    const creator = document.getElementById('app-creator').value.trim();
    const modder = document.getElementById('app-modder').value.trim();
    
    // Store Ref Block
    const logoType = document.getElementById('store-logo-type').value;
    const storeName = document.getElementById('store-display-name').value.trim();
    const storeUrl = document.getElementById('store-hyperlink').value.trim();

    // Sanitized description Box
    const description = document.getElementById('app-description').value.trim();

    if (!pkg || !name || !icon || !version || !category) {
      alert('Please fill out all mandatory fields: Package Name, App Title, Icon link, version and category.');
      return;
    }

    if (tempFeatures.length === 0) {
      alert('Please specify at least 1 Mod Feature inside the features appender.');
      return;
    }

    if (tempDownloads.length === 0) {
      alert('Please specify at least 1 Download Terminal Link row.');
      return;
    }

    const appPayload = {
      pkg,
      name,
      category,
      icon,
      version,
      creator: creator || 'Unknown',
      modder: modder || 'SR7 Mods',
      mod_features: [...tempFeatures],
      store_ref: {
        logo_type: logoType,
        display_name: storeName || 'Official Source',
        url: storeUrl || '#'
      },
      description: description || '<p class="text-gray-300">No specifications provided.</p>',
      download_links: [...tempDownloads]
    };

    if (editingAppPkg) {
      // Editing Mode - Find index and replace
      const idx = controlDB.app_list.findIndex(a => a.pkg === editingAppPkg);
      if (idx !== -1) {
        controlDB.app_list[idx] = appPayload;
        showToast(`System specification [${name}] updated!`);
      }
    } else {
      // Add Mode - Validate unique package
      if (controlDB.app_list.some(a => a.pkg === pkg)) {
        alert('An application with this Package Name already exists in indices.');
        return;
      }
      controlDB.app_list.push(appPayload);
      showToast(`System specification [${name}] injected successfully!`);
    }

    saveDatabaseState();
    modal.classList.add('hidden');
    editingAppPkg = null;
  });
}

function updateSelectors() {
  const catSelect = document.getElementById('app-category-select');
  if (!catSelect || !controlDB) return;

  const currentVal = catSelect.value;
  catSelect.innerHTML = '';
  controlDB.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    catSelect.appendChild(opt);
  });
  if (currentVal) catSelect.value = currentVal;
}

function openAppModalFor(pkg) {
  const modal = document.getElementById('app-editor-modal');
  const modalTitle = document.getElementById('modal-action-title');
  const appForm = document.getElementById('app-crud-form');
  const pkgInput = document.getElementById('app-pkg');

  updateSelectors();

  editingAppPkg = pkg;
  appForm.reset();
  tempFeatures = [];
  tempDownloads = [];

  if (pkg) {
    // EDIT MODE
    modalTitle.textContent = 'DECRYPT & EDIT APPLICATION METRICS';
    pkgInput.disabled = true; // Cannot edit package name of an existing record

    const app = controlDB.app_list.find(a => a.pkg === pkg);
    if (app) {
      document.getElementById('app-pkg').value = app.pkg;
      document.getElementById('app-name').value = app.name;
      document.getElementById('app-icon').value = app.icon;
      document.getElementById('app-version').value = app.version;
      document.getElementById('app-category-select').value = app.category;
      document.getElementById('app-creator').value = app.creator;
      document.getElementById('app-modder').value = app.modder;
      
      if (app.store_ref) {
        document.getElementById('store-logo-type').value = app.store_ref.logo_type || 'custom';
        document.getElementById('store-display-name').value = app.store_ref.display_name || '';
        document.getElementById('store-hyperlink').value = app.store_ref.url || '';
      }

      document.getElementById('app-description').value = app.description || '';
      
      tempFeatures = [...app.mod_features];
      tempDownloads = [...app.download_links];
    }
  } else {
    // ADD MODE
    modalTitle.textContent = 'INJECT NEW MOD SYSTEMSPEC';
    pkgInput.disabled = false;
  }

  renderTempFeatures();
  renderTempDownloads();
  modal.classList.remove('hidden');
}

// Render dynamic rows of temporary features during creation
function renderTempFeatures() {
  const container = document.getElementById('temp-features-list');
  if (!container) return;

  container.innerHTML = '';
  tempFeatures.forEach((feat, index) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-1.5 bg-cyan-950/20 border border-cyan-500/10 rounded mb-1 text-xs font-mono';
    item.innerHTML = `
      <span class="text-cyan-300 truncate mr-2">⚡ ${feat}</span>
      <div class="flex gap-2">
        <button class="edit-feat-item text-[10px] text-gray-400 hover:text-white" data-idx="${index}">✏️</button>
        <button class="del-feat-item text-[10px] text-rose-400 hover:text-rose-200" data-idx="${index}">❌</button>
      </div>
    `;

    item.querySelector('.edit-feat-item').addEventListener('click', (e) => {
      e.preventDefault();
      const updated = prompt('Edit Mod Feature Specification:', feat);
      if (updated && updated.trim()) {
        tempFeatures[index] = updated.trim();
        renderTempFeatures();
      }
    });

    item.querySelector('.del-feat-item').addEventListener('click', (e) => {
      e.preventDefault();
      tempFeatures.splice(index, 1);
      renderTempFeatures();
    });

    container.appendChild(item);
  });
}

// Render dynamic rows of temporary downloads during creation
function renderTempDownloads() {
  const container = document.getElementById('temp-downloads-list');
  if (!container) return;

  container.innerHTML = '';
  tempDownloads.forEach((dl, index) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-1.5 bg-pink-950/20 border border-pink-500/10 rounded mb-1 text-xs font-mono';
    item.innerHTML = `
      <div class="truncate mr-2">
        <span class="text-pink-400 font-semibold">${dl.name}</span>
        <span class="text-gray-500 text-[10px]"> (${dl.url})</span>
      </div>
      <div class="flex gap-2">
        <button class="edit-dl-item text-[10px] text-gray-400 hover:text-white" data-idx="${index}">✏️</button>
        <button class="del-dl-item text-[10px] text-rose-400 hover:text-rose-200" data-idx="${index}">❌</button>
      </div>
    `;

    item.querySelector('.edit-dl-item').addEventListener('click', (e) => {
      e.preventDefault();
      const newName = prompt('Edit Download Button Label:', dl.name);
      const newUrl = prompt('Edit Target Destination URL:', dl.url);
      if (newName && newUrl) {
        tempDownloads[index] = { name: newName.trim(), url: newUrl.trim() };
        renderTempDownloads();
      }
    });

    item.querySelector('.del-dl-item').addEventListener('click', (e) => {
      e.preventDefault();
      tempDownloads.splice(index, 1);
      renderTempDownloads();
    });

    container.appendChild(item);
  });
}

// 4. MAIN APPLICATIONS SPECIFICATIONS GRID
function renderAppsTable() {
  const container = document.getElementById('apps-table-tbody');
  if (!container || !controlDB) return;

  container.innerHTML = '';

  if (controlDB.app_list.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="p-8 text-center text-gray-500 font-mono text-xs">
          [ EMPTY ARCHIVE DATABASE ]
        </td>
      </tr>
    `;
    return;
  }

  controlDB.app_list.forEach(app => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-white/5 hover:bg-white/5 transition-colors font-mono text-xs text-gray-300';
    
    const catName = controlDB.categories.find(c => c.id === app.category)?.name || app.category;

    tr.innerHTML = `
      <td class="p-3 align-middle">
        <div class="flex items-center gap-3">
          <img src="${app.icon}" class="w-8 h-8 rounded object-cover border border-white/10" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80'">
          <div class="truncate max-w-[150px]">
            <span class="text-white font-semibold block truncate">${app.name}</span>
            <span class="text-gray-500 text-[10px] truncate block">${app.pkg}</span>
          </div>
        </div>
      </td>
      <td class="p-3 align-middle truncate max-w-[100px] text-cyan-300 uppercase">${catName}</td>
      <td class="p-3 align-middle text-pink-400 font-semibold">${app.version}</td>
      <td class="p-3 align-middle truncate max-w-[120px]">${app.mod_features.length} Features</td>
      <td class="p-3 align-middle text-right">
        <div class="flex gap-1.5 justify-end">
          <button class="edit-app-btn px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 hover:border-cyan-400 text-[10px] text-cyan-300 rounded uppercase font-mono transition-all" data-pkg="${app.pkg}">
            EDIT
          </button>
          <button class="delete-app-btn px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 hover:border-rose-400 text-[10px] text-rose-300 rounded uppercase font-mono transition-all" data-pkg="${app.pkg}">
            PURGE
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.edit-app-btn').addEventListener('click', () => {
      openAppModalFor(app.pkg);
    });

    tr.querySelector('.delete-app-btn').addEventListener('click', () => {
      if (confirm(`Are you absolutely sure you want to purge application [${app.name}] from the registry?`)) {
        controlDB.app_list = controlDB.app_list.filter(a => a.pkg !== app.pkg);
        // Also remove from recommended apps
        controlDB.recommended_apps = controlDB.recommended_apps.filter(pkg => pkg !== app.pkg);
        saveDatabaseState();
        showToast(`App [${app.name}] successfully purged.`);
      }
    });

    container.appendChild(tr);
  });
}

// 5. RECOMMENDED APPS INDEX SELECTION MANAGER
function renderRecommendedCheckboxes() {
  const container = document.getElementById('recommended-selection-grid');
  if (!container || !controlDB) return;

  container.innerHTML = '';

  if (controlDB.app_list.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-500 font-mono">No apps available in registry to flag as recommended.</p>`;
    return;
  }

  controlDB.app_list.forEach(app => {
    const isChecked = controlDB.recommended_apps.includes(app.pkg);
    const box = document.createElement('label');
    box.className = 'flex items-center gap-3 p-2 bg-black/30 border border-white/5 rounded-lg hover:border-cyan-500/20 cursor-pointer transition-all font-mono text-xs';
    
    box.innerHTML = `
      <input type="checkbox" class="rec-checkbox rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 bg-black/80" value="${app.pkg}" ${isChecked ? 'checked' : ''}>
      <img src="${app.icon}" class="w-6 h-6 rounded object-cover" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80'">
      <div class="truncate">
        <span class="text-white font-semibold truncate block">${app.name}</span>
      </div>
    `;

    box.querySelector('input').addEventListener('change', (e) => {
      const pkg = e.target.value;
      if (e.target.checked) {
        if (!controlDB.recommended_apps.includes(pkg)) {
          controlDB.recommended_apps.push(pkg);
        }
      } else {
        controlDB.recommended_apps = controlDB.recommended_apps.filter(p => p !== pkg);
      }
      saveDatabaseState();
      showToast('Carousel recommended pool modified.');
    });

    container.appendChild(box);
  });
}

// 6. JSON payload exporter
function renderJsonPayload() {
  const textarea = document.getElementById('json-output-payload');
  const copyBtn = document.getElementById('copy-json-btn');
  const downloadBtn = document.getElementById('download-json-btn');

  if (!textarea) return;

  const jsonStr = JSON.stringify(controlDB, null, 2);
  textarea.value = jsonStr;

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      textarea.select();
      navigator.clipboard.writeText(jsonStr).then(() => {
        showToast('JSON Database copied to clipboard!');
      }).catch(err => {
        alert('Could not copy automatically. Please select all and copy manually.');
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'storedetails.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('File storedetails.json downloading...');
    });
  }
}

// UI notification helper
function showToast(message) {
  let toast = document.getElementById('cyberpunk-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cyberpunk-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '999999';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="glass-panel border-cyan-500 animate-fade-in px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase shadow-[0_0_15px_rgba(0,242,254,0.3)]">
      <span class="text-cyan-400">⚡</span>
      <span>${message}</span>
    </div>
  `;

  setTimeout(() => {
    toast.innerHTML = '';
  }, 3500);
}
