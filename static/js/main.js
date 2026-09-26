/**
 * KRYX CHKR - CLIENT CONTROLLER & STREAM ENGINE
 * Developer: @sweartx | Telegram: t.me/KryxCheck
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. STATE VARIABLES (DECLARED FIRST TO AVOID TDZ ERRORS) ---
  let isRunning = false;
  let shouldStop = false;
  let audioCtx = null;
  let activeFilter = 'ALL';

  let totalCardsCount = 0;
  let checkedCount = 0;
  let stats = {
    approved: 0,
    threeDs: 0,
    declined: 0,
    error: 0
  };

  let allResults = [];
  let responseTimes = [];

  // --- 2. DOM ELEMENTS ---
  const cardsInput = document.getElementById('cardsInput');
  const loadedCount = document.getElementById('loadedCount');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const cleanDupesBtn = document.getElementById('cleanDupesBtn');
  const pasteInputBtn = document.getElementById('pasteInputBtn');
  const fileImport = document.getElementById('fileImport');

  // Stats Counters
  const statTotal = document.getElementById('statTotal');
  const statApproved = document.getElementById('statApproved');
  const stat3ds = document.getElementById('stat3ds');
  const statDeclined = document.getElementById('statDeclined');
  const statError = document.getElementById('statError');
  const approvedRate = document.getElementById('approvedRate');
  const threeDsRate = document.getElementById('threeDsRate');
  const declinedRate = document.getElementById('declinedRate');

  // Filter Tabs
  const tabCountAll = document.getElementById('tabCountAll');
  const tabCountApproved = document.getElementById('tabCountApproved');
  const tabCount3ds = document.getElementById('tabCount3ds');
  const tabCountDeclined = document.getElementById('tabCountDeclined');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Progress Bar
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatusText = document.getElementById('progressStatusText');
  const pulseIndicator = document.getElementById('pulseIndicator');

  // Results Stream
  const resultsBox = document.getElementById('resultsBox');
  const emptyState = document.getElementById('emptyState');
  const copyApprovedBtn = document.getElementById('copyApprovedBtn');
  const copy3dsBtn = document.getElementById('copy3dsBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const clearResultsBtn = document.getElementById('clearResultsBtn');
  const toastBox = document.getElementById('toastBox');
  const toastMsg = document.getElementById('toastMsg');

  // Telemetry & Language
  const onlineUserCount = document.getElementById('onlineUserCount');
  const langToggleBtn = document.getElementById('langToggleBtn');
  const currentLangLabel = document.getElementById('currentLangLabel');

  // --- 3. AUTHENTIC ACTIVE USER TRACKING ---
  function getClientId() {
    let cid = sessionStorage.getItem('kryx_client_id');
    if (!cid || cid.length < 8) {
      cid = 'c_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('kryx_client_id', cid);
    }
    return cid;
  }
  const clientId = getClientId();

  async function sendHeartbeat() {
    try {
      const res = await fetch(`/api/ping?client_id=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const data = await res.json();
        if (onlineUserCount && typeof data.active_users === 'number') {
          onlineUserCount.textContent = data.active_users;
        }
      }
    } catch (e) {}
  }
  sendHeartbeat();
  setInterval(sendHeartbeat, 10000);

  // Tab disconnect listener
  window.addEventListener('beforeunload', () => {
    try {
      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('client_id', clientId);
        navigator.sendBeacon('/api/disconnect', formData);
      }
    } catch (e) {}
  });

  // --- 4. BILINGUAL TRANSLATIONS (TR / EN) ---
  const TRANSLATIONS = {
    tr: {
      online_lbl: 'ONLINE:',
      online_sub: 'USERS',
      stat_processed: 'İŞLENDİ',
      stat_total: 'TOPLAM KART',
      stat_approved: 'APPROVED',
      stat_3ds: '3D SECURE',
      stat_declined: 'DECLINED',
      stat_fail: 'FAIL',
      stat_error: 'ERROR',
      status_idle: 'SİSTEM HAZIR',
      status_processing: 'İŞLENİYOR ({curr}/{total}) • %{pct}',
      status_completed: 'TAMAMLANDI ({count} KART)',
      status_stopped: 'DURDURULDU ({curr}/{total})',
      status_stopping: 'DURDURULUYOR...',
      panel_input: 'KART GİRİŞİ',
      btn_paste: 'Yapıştır',
      btn_filter: 'Tekilleri Ayıkla',
      btn_clear: 'Temizle',
      loaded_label: 'YÜKLENEN:',
      btn_upload: '.TXT YÜKLE',
      btn_start: 'BAŞLAT',
      btn_stop: 'DURDUR',
      btn_reset: 'SIFIRLA',
      panel_results: 'CANLI SONUÇLAR',
      tab_all: 'Tümü',
      btn_copy_app: 'Approved Kopyala',
      btn_copy_3ds: '3DS Kopyala',
      btn_download: 'Rapor (.TXT)',
      btn_clear_res: 'Temizle',
      empty_title: 'KONSOL HAZIR',
      empty_desc: 'Sonuçlar burada anlık akacaktır.',
      placeholder: "4140497098472757|09|27|057\n4532015887410023|11|28|123\n5425231234567890|05|26|999\n\nFormat: CARD|MM|YY|CVV",
      toast_copied: 'Panodan yapıştırıldı',
      toast_empty_clip: 'Pano boş',
      toast_paste_manual: 'Ctrl+V ile yapıştırın',
      toast_dupes_cleared: 'Tekiller ayıklandı: {count} silindi',
      toast_cleared: 'Temizlendi',
      toast_file_loaded: 'Dosya yüklendi',
      toast_no_cards: 'Lütfen kart girin',
      toast_done: 'Tamamlandı',
      toast_stopped: 'Durduruldu',
      toast_counters_reset: 'Sıfırlandı',
      toast_results_cleared: 'Temizlendi',
      toast_no_approved: 'Approved kart yok',
      toast_app_copied: '{count} Approved Kopyalandı',
      toast_no_3ds: '3DS kart yok',
      toast_3ds_copied: '{count} 3DS Kopyalandı',
      toast_report_downloaded: 'Rapor İndirildi',
      toast_no_export_data: 'Veri yok',
      toast_copied_card: 'Kopyalandı',
      no_bank_info: 'Banka Yok',
      copy_card_title: 'Kopyala'
    },
    en: {
      online_lbl: 'ONLINE:',
      online_sub: 'USERS',
      stat_processed: 'PROCESSED',
      stat_total: 'TOTAL CARDS',
      stat_approved: 'APPROVED',
      stat_3ds: '3D SECURE',
      stat_declined: 'DECLINED',
      stat_fail: 'FAIL',
      stat_error: 'ERROR',
      status_idle: 'SYSTEM READY',
      status_processing: 'PROCESSING ({curr}/{total}) • {pct}%',
      status_completed: 'COMPLETED ({count} CARDS)',
      status_stopped: 'STOPPED ({curr}/{total})',
      status_stopping: 'STOPPING...',
      panel_input: 'CARD BATCH INPUT',
      btn_paste: 'Paste',
      btn_filter: 'Filter Dupes',
      btn_clear: 'Clear',
      loaded_label: 'LOADED:',
      btn_upload: 'UPLOAD .TXT',
      btn_start: 'START',
      btn_stop: 'STOP',
      btn_reset: 'RESET',
      panel_results: 'LIVE RESULTS',
      tab_all: 'All',
      btn_copy_app: 'Copy Approved',
      btn_copy_3ds: 'Copy 3DS',
      btn_download: 'Report (.TXT)',
      btn_clear_res: 'Clear',
      empty_title: 'CONSOLE READY',
      empty_desc: 'Results will stream here in real time.',
      placeholder: "4140497098472757|09|27|057\n4532015887410023|11|28|123\n5425231234567890|05|26|999\n\nFormat: CARD|MM|YY|CVV",
      toast_copied: 'Pasted from clipboard',
      toast_empty_clip: 'Clipboard is empty',
      toast_paste_manual: 'Press Ctrl+V to paste',
      toast_dupes_cleared: 'Duplicates removed: {count}',
      toast_cleared: 'Cleared',
      toast_file_loaded: 'File imported',
      toast_no_cards: 'Please enter cards',
      toast_done: 'Completed',
      toast_stopped: 'Stopped',
      toast_counters_reset: 'Reset',
      toast_results_cleared: 'Cleared',
      toast_no_approved: 'No approved cards',
      toast_app_copied: '{count} Approved Copied',
      toast_no_3ds: 'No 3DS cards',
      toast_3ds_copied: '{count} 3DS Copied',
      toast_report_downloaded: 'Report Downloaded',
      toast_no_export_data: 'No data to export',
      toast_copied_card: 'Copied',
      no_bank_info: 'No Bank',
      copy_card_title: 'Copy'
    }
  };

  let currentLang = localStorage.getItem('kryx_lang') || 'tr';
  if (!TRANSLATIONS[currentLang]) currentLang = 'tr';

  function t(key, vars = {}) {
    let str = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || (TRANSLATIONS['en'][key] || key);
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('kryx_lang', lang);
    document.documentElement.lang = lang;

    if (currentLangLabel) {
      currentLangLabel.textContent = lang.toUpperCase();
    }

    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.textContent = TRANSLATIONS[lang][key];
      }
    });

    if (cardsInput) {
      cardsInput.placeholder = t('placeholder');
    }

    if (!isRunning && progressStatusText) {
      if (checkedCount > 0 && checkedCount >= totalCardsCount) {
        progressStatusText.textContent = t('status_completed', { count: checkedCount });
      } else if (checkedCount > 0) {
        progressStatusText.textContent = t('status_stopped', { curr: checkedCount, total: totalCardsCount });
      } else {
        progressStatusText.textContent = t('status_idle');
      }
    }
  }

  // Set initial language safely
  applyLanguage(currentLang);

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = currentLang === 'tr' ? 'en' : 'tr';
      applyLanguage(nextLang);
      showToast(nextLang === 'tr' ? 'Dil: Türkçe' : 'Language: English');
    });
  }

  // --- 5. AUDIO FEEDBACK ---
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, delay = 0) {
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    } catch (e) {}
  }

  function playSuccess() {
    playTone(523.25, 'sine', 0.1, 0);
    playTone(659.25, 'sine', 0.15, 0.08);
    playTone(783.99, 'sine', 0.25, 0.16);
  }

  function playFail() {
    playTone(180, 'triangle', 0.12, 0);
  }

  // --- 6. TOAST NOTIFICATION ---
  function showToast(message) {
    if (!toastBox || !toastMsg) return;
    toastMsg.textContent = message;
    toastBox.classList.add('show');
    setTimeout(() => {
      toastBox.classList.remove('show');
    }, 2200);
  }

  // --- 7. INPUT HELPERS ---
  function getCleanLines() {
    if (!cardsInput) return [];
    return cardsInput.value
      .split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (!l) return false;
        if (l.startsWith('#') || l.startsWith('//') || l.toLowerCase().startsWith('format:')) return false;
        return true;
      });
  }

  function updateLoadedCount() {
    if (loadedCount) {
      loadedCount.textContent = getCleanLines().length;
    }
  }

  if (cardsInput) {
    ['input', 'change', 'keyup', 'paste'].forEach(evt => {
      cardsInput.addEventListener(evt, () => setTimeout(updateLoadedCount, 10));
    });
    updateLoadedCount();
  }

  if (pasteInputBtn) {
    pasteInputBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const current = cardsInput.value.trim();
          cardsInput.value = current ? current + '\n' + text.trim() : text.trim();
          updateLoadedCount();
          showToast(t('toast_copied'));
        } else {
          showToast(t('toast_empty_clip'));
        }
      } catch (e) {
        cardsInput.focus();
        showToast(t('toast_paste_manual'));
      }
    });
  }

  if (cleanDupesBtn) {
    cleanDupesBtn.addEventListener('click', () => {
      const lines = getCleanLines();
      const unique = [...new Set(lines)];
      cardsInput.value = unique.join('\n');
      updateLoadedCount();
      showToast(t('toast_dupes_cleared', { count: lines.length - unique.length }));
    });
  }

  if (clearInputBtn) {
    clearInputBtn.addEventListener('click', () => {
      cardsInput.value = '';
      updateLoadedCount();
      showToast(t('toast_cleared'));
    });
  }

  if (fileImport) {
    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        cardsInput.value = event.target.result;
        updateLoadedCount();
        showToast(t('toast_file_loaded'));
      };
      reader.readAsText(file);
      fileImport.value = '';
    });
  }

  // --- 8. PROGRESS & COUNTERS ---
  function updateProgress() {
    const pct = totalCardsCount > 0 ? Math.round((checkedCount / totalCardsCount) * 100) : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressPercent) progressPercent.textContent = pct + '%';

    if (pulseIndicator) {
      if (isRunning) pulseIndicator.classList.add('active');
      else pulseIndicator.classList.remove('active');
    }

    if (progressStatusText) {
      if (isRunning) {
        progressStatusText.textContent = t('status_processing', { curr: checkedCount, total: totalCardsCount, pct: pct });
      } else if (checkedCount > 0 && checkedCount >= totalCardsCount) {
        progressStatusText.textContent = t('status_completed', { count: checkedCount });
      } else {
        progressStatusText.textContent = checkedCount > 0 ? t('status_stopped', { curr: checkedCount, total: totalCardsCount }) : t('status_idle');
      }
    }
  }

  function updateCounters() {
    if (statTotal) statTotal.textContent = checkedCount;
    if (statApproved) statApproved.textContent = stats.approved;
    if (stat3ds) stat3ds.textContent = stats.threeDs;
    if (statDeclined) statDeclined.textContent = stats.declined;
    if (statError) statError.textContent = stats.error;

    const processed = checkedCount || 0;
    const appPct = processed > 0 ? ((stats.approved / processed) * 100).toFixed(1) : '0.0';
    const tdsPct = processed > 0 ? ((stats.threeDs / processed) * 100).toFixed(1) : '0.0';
    const decPct = processed > 0 ? ((stats.declined / processed) * 100).toFixed(1) : '0.0';

    if (approvedRate) approvedRate.textContent = `${appPct}%`;
    if (threeDsRate) threeDsRate.textContent = `${tdsPct}%`;
    if (declinedRate) declinedRate.textContent = `${decPct}%`;

    if (tabCountAll) tabCountAll.textContent = allResults.length;
    if (tabCountApproved) tabCountApproved.textContent = stats.approved;
    if (tabCount3ds) tabCount3ds.textContent = stats.threeDs;
    if (tabCountDeclined) tabCountDeclined.textContent = stats.declined;
  }

  // --- 9. RENDER RESULT CARD (POLISHED, NO FLUFF, CRAMP-PROOF) ---
  function renderResultCard(data) {
    if (emptyState) {
      emptyState.style.display = 'none';
    }

    const cardEl = document.createElement('div');
    cardEl.className = `result-card card-${data.status}`;
    cardEl.dataset.status = data.status;

    let badgeIcon = 'fa-circle-xmark';
    let statusLabel = data.status;
    if (data.status === 'APPROVED') {
      badgeIcon = 'fa-circle-check';
      statusLabel = 'APPROVED';
    } else if (data.status === '3D_SECURE') {
      badgeIcon = 'fa-shield-halved';
      statusLabel = '3D SECURE';
    } else if (data.status === 'INSUFFICIENT_FUNDS') {
      badgeIcon = 'fa-coins';
      statusLabel = 'INSUFFICIENT';
    } else if (data.status === 'ERROR') {
      badgeIcon = 'fa-triangle-exclamation';
      statusLabel = 'ERROR';
    }

    const cardDisplay = data.card || 'Card';
    const declineCodeBadge = data.decline_code ? `<span class="bin-chip" style="color: #f87171; background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.3); font-weight: 700;">[${data.decline_code}]</span>` : '';
    const binData = data.bin_data || {};
    
    // Construct rich bin chips
    let binChipsHtml = '';
    if (binData.bin) binChipsHtml += `<span class="bin-chip chip-bank"><i class="fa-solid fa-credit-card"></i> ${binData.bin}</span>`;
    if (binData.brand) binChipsHtml += `<span class="bin-chip">${binData.brand}</span>`;
    if (binData.type) binChipsHtml += `<span class="bin-chip">${binData.type}</span>`;
    if (binData.card_level) binChipsHtml += `<span class="bin-chip">${binData.card_level}</span>`;
    if (binData.issuer_name) binChipsHtml += `<span class="bin-chip chip-bank">${binData.issuer_name}</span>`;
    if (binData.country_alpha3) binChipsHtml += `<span class="bin-chip">${binData.country_alpha3}</span>`;
    if (!binChipsHtml && data.raw_bin) {
      binChipsHtml = `<span class="bin-chip">${data.raw_bin}</span>`;
    }
    if (!binChipsHtml) {
      binChipsHtml = `<span class="bin-chip">${t('no_bank_info')}</span>`;
    }

    cardEl.innerHTML = `
      <div class="result-card-header">
        <span class="res-badge badge-${data.status}">
          <i class="fa-solid ${badgeIcon}"></i> ${statusLabel}
        </span>
        <div class="res-meta">
          <span><i class="fa-regular fa-clock"></i> ${data.time_taken || '0.00s'}</span>
          <span style="color: var(--neon-yellow); font-weight: 700;"><i class="fa-solid fa-tag"></i> ${data.amount || '0.00'}</span>
        </div>
      </div>

      <div class="res-card-str">
        <span>${cardDisplay}</span>
        <button class="copy-icon-btn" title="${t('copy_card_title')}" data-card="${cardDisplay}">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>

      <div class="res-msg-box">
        <div style="display: flex; align-items: flex-start; gap: 0.45rem;">
          <i class="fa-solid fa-angle-right" style="margin-top: 0.2rem; color: var(--neon-yellow);"></i>
          <div>
            ${declineCodeBadge}
            <span>${data.message || 'No response message'}</span>
          </div>
        </div>
      </div>

      <div class="res-bin-box">
        <i class="fa-solid fa-earth-americas" style="color: var(--neon-yellow); font-size: 0.8rem;"></i>
        ${binChipsHtml}
      </div>
    `;

    if (activeFilter !== 'ALL' && activeFilter !== data.status) {
      if (!(activeFilter === '3D_SECURE' && data.status === 'INSUFFICIENT_FUNDS')) {
        cardEl.style.display = 'none';
      }
    }

    resultsBox.insertBefore(cardEl, resultsBox.firstChild);

    // One-click copy listener
    const copyBtn = cardEl.querySelector('.copy-icon-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        const cardVal = e.currentTarget.dataset.card;
        navigator.clipboard.writeText(cardVal).then(() => {
          showToast(`${t('toast_copied_card')}: ${cardVal}`);
        });
      });
    }
  }

  // --- 10. FILTER TABS ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;

      const items = resultsBox.querySelectorAll('.result-card');
      items.forEach(card => {
        const cardStatus = card.dataset.status;
        if (activeFilter === 'ALL') {
          card.style.display = 'flex';
        } else if (activeFilter === cardStatus) {
          card.style.display = 'flex';
        } else if (activeFilter === '3D_SECURE' && cardStatus === 'INSUFFICIENT_FUNDS') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- 11. API CHECK REQUEST ---
  async function checkCardRequest(cardLine) {
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: cardLine,
          client_id: clientId
        })
      });
      return await res.json();
    } catch (err) {
      return {
        status: 'ERROR',
        message: currentLang === 'tr' ? 'Ağ Hatası' : 'Network Error',
        card: cardLine,
        decline_code: 'network_error',
        amount: '0.00',
        raw_bin: null,
        time_taken: '0.00s'
      };
    }
  }

  // --- 12. RUNNER MAIN LOOP ---
  async function runChecker() {
    let lines = getCleanLines();
    if (lines.length === 0) {
      showToast(t('toast_no_cards'));
      return;
    }

    isRunning = true;
    shouldStop = false;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = true;
    initAudio();

    if (totalCardsCount === 0 || checkedCount >= totalCardsCount) {
      totalCardsCount = lines.length;
      checkedCount = 0;
      updateProgress();
    }

    while (lines.length > 0 && !shouldStop) {
      const currentCard = lines.shift();
      cardsInput.value = lines.join('\n');
      updateLoadedCount();

      const result = await checkCardRequest(currentCard);

      if (result.time_taken) {
        const num = parseFloat(result.time_taken);
        if (!isNaN(num)) responseTimes.push(num);
      }

      allResults.push(result);
      checkedCount++;

      if (result.status === 'APPROVED') {
        stats.approved++;
        playSuccess();
      } else if (result.status === '3D_SECURE' || result.status === 'INSUFFICIENT_FUNDS') {
        stats.threeDs++;
        playSuccess();
      } else if (result.status === 'DECLINED') {
        stats.declined++;
        playFail();
      } else {
        stats.error++;
        playFail();
      }

      renderResultCard(result);
      updateCounters();
      updateProgress();

      if (shouldStop) break;
      await new Promise(r => setTimeout(r, 200));
    }

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = false;
    updateProgress();

    if (shouldStop) {
      showToast(t('toast_stopped'));
    } else {
      showToast(t('toast_done'));
    }
  }

  // --- 13. ACTION BUTTON LISTENERS ---
  if (startBtn) {
    startBtn.addEventListener('click', runChecker);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      shouldStop = true;
      stopBtn.disabled = true;
      if (progressStatusText) {
        progressStatusText.textContent = t('status_stopping');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (isRunning) return;
      totalCardsCount = 0;
      checkedCount = 0;
      stats = { approved: 0, threeDs: 0, declined: 0, error: 0 };
      responseTimes = [];
      updateCounters();
      updateProgress();
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';
      if (progressStatusText) progressStatusText.textContent = t('status_idle');
      showToast(t('toast_counters_reset'));
    });
  }

  if (clearResultsBtn) {
    clearResultsBtn.addEventListener('click', () => {
      resultsBox.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'flex';
        resultsBox.appendChild(emptyState);
      }
      allResults = [];
      stats = { approved: 0, threeDs: 0, declined: 0, error: 0 };
      responseTimes = [];
      updateCounters();
      showToast(t('toast_results_cleared'));
    });
  }

  if (copyApprovedBtn) {
    copyApprovedBtn.addEventListener('click', () => {
      const liveCards = allResults
        .filter(r => r.status === 'APPROVED')
        .map(r => r.card)
        .filter(Boolean);

      if (liveCards.length === 0) {
        showToast(t('toast_no_approved'));
        return;
      }

      navigator.clipboard.writeText(liveCards.join('\n')).then(() => {
        showToast(t('toast_app_copied', { count: liveCards.length }));
      });
    });
  }

  if (copy3dsBtn) {
    copy3dsBtn.addEventListener('click', () => {
      const tdsCards = allResults
        .filter(r => r.status === '3D_SECURE' || r.status === 'INSUFFICIENT_FUNDS')
        .map(r => r.card)
        .filter(Boolean);

      if (tdsCards.length === 0) {
        showToast(t('toast_no_3ds'));
        return;
      }

      navigator.clipboard.writeText(tdsCards.join('\n')).then(() => {
        showToast(t('toast_3ds_copied', { count: tdsCards.length }));
      });
    });
  }

  if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener('click', () => {
      if (allResults.length === 0) {
        showToast(t('toast_no_export_data'));
        return;
      }

      let report = `=======================================================\n`;
      report += `  KRYX CHKR REPORT\n`;
      report += `  Telegram: t.me/KryxCheck | Dev: @sweartx\n`;
      report += `  Date: ${new Date().toUTCString()}\n`;
      report += `  Total: ${allResults.length} | Approved: ${stats.approved} | 3DS: ${stats.threeDs} | Declined: ${stats.declined} | Error: ${stats.error}\n`;
      report += `=======================================================\n\n`;

      report += `--- APPROVED (${stats.approved}) ---\n`;
      allResults.filter(r => r.status === 'APPROVED').forEach(r => {
        report += `${r.card} | ${r.amount} | ${r.message} | ${r.raw_bin || ''}\n`;
      });

      report += `\n--- 3D SECURE / INSUFFICIENT (${stats.threeDs}) ---\n`;
      allResults.filter(r => r.status === '3D_SECURE' || r.status === 'INSUFFICIENT_FUNDS').forEach(r => {
        report += `${r.card} | ${r.amount} | ${r.message} | ${r.raw_bin || ''}\n`;
      });

      report += `\n--- DECLINED (${stats.declined}) ---\n`;
      allResults.filter(r => r.status === 'DECLINED').forEach(r => {
        report += `${r.card} | ${r.amount} | ${r.message} | ${r.raw_bin || ''}\n`;
      });

      if (stats.error > 0) {
        report += `\n--- ERROR (${stats.error}) ---\n`;
        allResults.filter(r => r.status === 'ERROR').forEach(r => {
          report += `${r.card} | ${r.message}\n`;
        });
      }

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kryx_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast_report_downloaded'));
    });
  }
});
