/**
 * File-Du — Single Page Application
 * 路由：
 *   /          → 公开下载列表（无需登录）
 *   /admin     → 管理后台（需要登录）：上传 | 远程下载 | 文件管理
 *   /share/:id → 公开分享页（无需登录）
 */

;(function () {
  'use strict'

  // ─── Constants ──────────────────────────────────────────────────────────────
  const THEME_KEY = 'fd-theme'
  const LANG_KEY = 'fd-lang'

  // ─── State ──────────────────────────────────────────────────────────────────
  const state = {
    theme: localStorage.getItem(THEME_KEY) || 'dark',
    lang: localStorage.getItem(LANG_KEY) || 'zh',
    authenticated: false,
    activeUploads: [],
    activeDownloads: [],
    adminTab: 'upload', // 'upload' | 'remote' | 'files'
  }

  // ─── i18n ───────────────────────────────────────────────────────────────────
  const t = key => (window.i18n ? window.i18n.t(key, state.lang) : key)

  // ─── SVG Icons ───────────────────────────────────────────────────────────────
  const ico = {
    logoMark: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#g)" stroke-width="2"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    upload: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    uploadSm: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    downloadSm: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    remote: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    files: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    lock: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    lockSm: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    logout: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    inbox: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    fileX: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"/><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"/></svg>`,
    fileGeneric: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
    fileImage: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    fileVideo: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    fileAudio: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    filePdf: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    fileArchive: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="1.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    fileText: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  function fmtSize(bytes) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024,
      s = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i]
  }
  function fmtSpeed(bps) {
    return fmtSize(bps) + '/s'
  }
  function fmtEta(s) {
    if (!s || s <= 0) return ''
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }
  function fmtDate(iso) {
    return new Date(iso).toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-US')
  }
  function fmtRelDate(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000),
      h = Math.floor(m / 60),
      d = Math.floor(h / 24)
    if (state.lang === 'zh') {
      if (m < 1) return '刚刚'
      if (m < 60) return `${m}分钟前`
      if (h < 24) return `${h}小时前`
      if (d < 30) return `${d}天前`
      return fmtDate(iso)
    } else {
      if (m < 1) return 'just now'
      if (m < 60) return `${m}m ago`
      if (h < 24) return `${h}h ago`
      if (d < 30) return `${d}d ago`
      return fmtDate(iso)
    }
  }
  function fileIcon(mimeType) {
    if (!mimeType) return ico.fileGeneric
    if (mimeType.startsWith('image/')) return ico.fileImage
    if (mimeType.startsWith('video/')) return ico.fileVideo
    if (mimeType.startsWith('audio/')) return ico.fileAudio
    if (mimeType === 'application/pdf') return ico.filePdf
    if (/zip|rar|tar|7z|gz|bz2/.test(mimeType)) return ico.fileArchive
    if (mimeType.startsWith('text/')) return ico.fileText
    return ico.fileGeneric
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = Object.assign(document.createElement('textarea'), { value: text })
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    showToast(t('toast.copied'), 'success', 2000)
  }

  // ─── Theme / Lang ─────────────────────────────────────────────────────────
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme)
    document.documentElement.lang = state.lang
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, state.theme)
    applyTheme()
    renderNav()
  }
  function toggleLang() {
    state.lang = state.lang === 'zh' ? 'en' : 'zh'
    localStorage.setItem(LANG_KEY, state.lang)
    applyTheme()
    renderNav()
    route()
  }

  // ─── Navbar ──────────────────────────────────────────────────────────────────
  function renderNav() {
    const cur = location.pathname
    document.getElementById('navbar').innerHTML = `
      <div class="nav-container">
        <a href="/" class="nav-logo" onclick="event.preventDefault();navigate('/')">
          ${ico.logoMark}<span>File-Du</span>
        </a>
        <div class="nav-links">
          <a href="/" class="nav-link${cur === '/' ? ' active' : ''}" onclick="event.preventDefault();navigate('/')">${t('nav.home')}</a>
          <a href="/admin" class="nav-link${cur === '/admin' ? ' active' : ''}" onclick="event.preventDefault();navigate('/admin')">
            ${ico.lockSm} ${t('nav.admin')}
          </a>
        </div>
        <div class="nav-actions">
          <button class="icon-btn" onclick="toggleTheme()" title="${t('nav.theme')}">${state.theme === 'dark' ? ico.sun : ico.moon}</button>
          <button class="icon-btn lang-btn" onclick="toggleLang()">${state.lang === 'zh' ? 'EN' : '中'}</button>
          ${state.authenticated ? `<button class="nav-link" onclick="logout()" style="gap:.3rem">${ico.logout} ${t('nav.logout')}</button>` : ''}
        </div>
      </div>`
  }

  // ─── Router ──────────────────────────────────────────────────────────────────
  function navigate(path) {
    history.pushState({}, '', path)
    route()
  }

  function route() {
    const p = location.pathname
    const shareMatch = p.match(/^\/share\/([^/]+)/)
    if (shareMatch) return renderSharePage(shareMatch[1])
    if (p === '/admin') return renderAdminPage()
    return renderHomePage()
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────
  async function checkAuth() {
    try {
      const r = await fetch('/api/auth/status')
      const d = await r.json()
      state.authenticated = !!d.authenticated
    } catch {
      state.authenticated = false
    }
  }

  async function submitLogin() {
    const pwd = document.getElementById('login-pwd')?.value
    const errEl = document.getElementById('login-error')
    if (!pwd) return
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      if (r.ok) {
        state.authenticated = true
        renderNav()
        renderAdminPage()
      } else {
        if (errEl) {
          errEl.textContent = t('login.error')
          errEl.style.display = 'block'
        }
        const card = document.querySelector('.login-card')
        if (card) {
          card.classList.add('shake')
          setTimeout(() => card.classList.remove('shake'), 400)
        }
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message
        errEl.style.display = 'block'
      }
    }
  }

  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId)
    if (!input) return
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    btn.innerHTML = isPassword ? ico.eyeOff : ico.eye
    btn.title = isPassword ? t('login.hide_password') : t('login.show_password')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    state.authenticated = false
    renderNav()
    navigate('/')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE — 公开下载列表
  // ═══════════════════════════════════════════════════════════════════════════
  async function renderHomePage() {
    document.title = `File-Du — ${t('home.list.title')}`
    const content = document.getElementById('main-content')

    content.innerHTML = `
      <div class="container">
        <div class="page-header" style="margin-top:2rem">
          <div>
            <h1 class="page-title">${t('home.list.title')}</h1>
            <p style="color:var(--text-secondary);font-size:.875rem;margin-top:.25rem">${t('home.list.sub')}</p>
          </div>
        </div>
        <div id="pub-files-container"><div class="loading">${t('common.loading')}</div></div>
      </div>`

    loadPublicFiles()
  }

  function clearInput(inputId, callback) {
    const input = document.getElementById(inputId)
    if (input) {
      input.value = ''
      input.focus()
      updateClearBtn(inputId)
      if (callback) callback()
    }
  }

  function updateClearBtn(inputId) {
    const input = document.getElementById(inputId)
    const clearBtn = document.getElementById(`${inputId}-clear`)
    if (input && clearBtn) {
      clearBtn.style.display = input.value ? 'flex' : 'none'
    }
  }

  let _pubSearchTimer = null
  function debouncePublicSearch() {
    clearTimeout(_pubSearchTimer)
    _pubSearchTimer = setTimeout(loadPublicFiles, 280)
  }

  async function loadPublicFiles() {
    const el = document.getElementById('pub-files-container')
    if (!el) return

    const search = document.getElementById('pub-search')?.value || ''
    const sortBy = document.getElementById('pub-sort-by')?.value || 'uploadedAt'
    const sortDir = document.getElementById('pub-sort-dir')?.value || 'desc'
    const params = new URLSearchParams({ search, sortBy, sortDir })

    try {
      const r = await fetch(`/api/public/files?${params}`)
      const { files = [] } = await r.json()

      if (!files.length) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-icon">${ico.inbox}</div>
          <p>${t('files.empty')}</p>
          <button class="btn-primary" style="margin-top:1rem" onclick="navigate('/admin')">${ico.uploadSm} ${t('files.empty_action')}</button>
          <p style="font-size:.8rem;color:var(--text-muted);margin-top:.5rem">${t('files.empty_hint')}</p>
        </div>`
        return
      }

      el.innerHTML = `
        <div class="files-toolbar" style="margin-bottom:1.25rem">
          <div class="search-wrapper">
            <span class="search-icon">${ico.search}</span>
            <input type="text" id="pub-search" class="search-input" placeholder="${t('files.search')}" value="${esc(search)}"
              oninput="debouncePublicSearch()">
            ${search ? `<button class="search-clear" onclick="clearInput('pub-search', debouncePublicSearch)">${ico.clear}</button>` : ''}
          </div>
          <div class="sort-options">
            <select id="pub-sort-by" class="select" onchange="loadPublicFiles()">
              <option value="uploadedAt" ${sortBy === 'uploadedAt' ? 'selected' : ''}>${t('files.sort.date')}</option>
              <option value="size" ${sortBy === 'size' ? 'selected' : ''}>${t('files.sort.size')}</option>
              <option value="originalName" ${sortBy === 'originalName' ? 'selected' : ''}>${t('files.sort.name')}</option>
              <option value="downloads" ${sortBy === 'downloads' ? 'selected' : ''}>${t('files.sort.downloads')}</option>
            </select>
            <select id="pub-sort-dir" class="select" onchange="loadPublicFiles()">
              <option value="desc" ${sortDir === 'desc' ? 'selected' : ''}>${t('files.sort.desc')}</option>
              <option value="asc" ${sortDir === 'asc' ? 'selected' : ''}>${t('files.sort.asc')}</option>
            </select>
          </div>
        </div>
        <div class="file-list">
          ${files
            .map(
              f => `
            <div class="file-item">
              <div class="file-icon">${fileIcon(f.mimeType)}</div>
              <div class="file-info">
                <div class="file-name" title="${esc(f.originalName)}">${esc(f.originalName)}</div>
                <div class="file-meta">
                  <span>${fmtSize(f.size)}</span><span>·</span>
                  <span>${fmtRelDate(f.uploadedAt)}</span><span>·</span>
                  <span>${f.downloads} ${t('files.downloads')}</span>
                </div>
              </div>
              <div class="file-actions">
                <button class="btn-sm btn-outline" title="${t('files.actions.copy')}"
                  onclick="copyText('${location.origin}/share/${f.id}')">${ico.link} ${state.lang === 'zh' ? '复制链接' : 'Copy'}</button>
                <a href="/share/${f.id}" class="btn-sm btn-primary" style="text-decoration:none">
                  ${ico.downloadSm} ${t('share.download_btn')}
                </a>
              </div>
            </div>`
            )
            .join('')}
        </div>
        <div class="files-footer">${files.length} ${t('files.count')}</div>`
    } catch (err) {
      el.innerHTML = `<div class="error-state">${esc(err.message)}</div>`
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN PAGE — 需要登录：上传 / 远程下载 / 文件管理
  // ═══════════════════════════════════════════════════════════════════════════
  async function renderAdminPage() {
    document.title = `File-Du — ${t('admin.title')}`
    await checkAuth()
    renderNav()

    const content = document.getElementById('main-content')

    if (!state.authenticated) {
      content.innerHTML = `
        <div class="container">
          <div class="login-screen">
            <div class="card login-card">
              <div class="login-icon">${ico.lock}</div>
              <h2>${t('login.title')}</h2>
              <p>${t('login.sub')}</p>
              <div class="login-form">
                <div class="password-input-wrapper">
                  <input type="password" id="login-pwd" class="input" placeholder="${t('login.placeholder')}"
                    onkeydown="if(event.key==='Enter')submitLogin()">
                  <button type="button" class="password-toggle" onclick="togglePasswordVisibility('login-pwd', this)" title="${t('login.show_password')}">
                    ${ico.eye}
                  </button>
                </div>
                <div id="login-error" class="form-error" style="display:none"></div>
                <button class="btn-primary btn-full" onclick="submitLogin()">${t('login.btn')}</button>
              </div>
            </div>
          </div>
        </div>`
      setTimeout(() => document.getElementById('login-pwd')?.focus(), 80)
      return
    }

    // ── Logged in: show 3-tab admin ──
    content.innerHTML = `
      <div class="container">
        <div class="page-header" style="margin-top:2rem">
          <h1 class="page-title">${t('admin.title')}</h1>
        </div>
        <div class="card transfer-card">
          <div class="tab-bar">
            <button class="tab${state.adminTab === 'upload' ? ' active' : ''}" id="atab-upload" onclick="switchAdminTab('upload')">
              ${ico.uploadSm} ${t('home.tabs.upload')}
            </button>
            <button class="tab${state.adminTab === 'remote' ? ' active' : ''}" id="atab-remote" onclick="switchAdminTab('remote')">
              ${ico.remote} ${t('home.tabs.remote')}
            </button>
            <button class="tab${state.adminTab === 'files' ? ' active' : ''}" id="atab-files" onclick="switchAdminTab('files')">
              ${ico.files} ${t('admin.tabs.files')}
            </button>
          </div>
          <div id="admin-tab-content">${renderAdminTabContent()}</div>
        </div>
        <div id="active-transfers"></div>
      </div>`

    initAdminTab()
  }

  function renderAdminTabContent() {
    if (state.adminTab === 'upload') return `<div class="tab-content">${uploadZoneHTML()}</div>`
    if (state.adminTab === 'remote') return `<div class="tab-content">${remoteFormHTML()}</div>`
    if (state.adminTab === 'files')
      return `<div class="tab-content files-tab-pane"><div id="files-container"><div class="loading">${t('common.loading')}</div></div></div>`
    return ''
  }

  function switchAdminTab(tab) {
    state.adminTab = tab
    document.querySelectorAll('.tab-bar .tab').forEach(b => b.classList.remove('active'))
    document.getElementById(`atab-${tab}`)?.classList.add('active')
    document.getElementById('admin-tab-content').innerHTML = renderAdminTabContent()
    initAdminTab()
  }

  function initAdminTab() {
    if (state.adminTab === 'upload') initUploadZone()
    if (state.adminTab === 'files') loadFileList()
    renderTransfers()
  }

  // ─── Upload Zone ─────────────────────────────────────────────────────────────
  function uploadZoneHTML() {
    return `<div class="upload-zone" id="upload-zone">
      <input type="file" id="file-input" multiple hidden>
      <div class="upload-zone-content">
        <div class="upload-icon">${ico.upload}</div>
        <p class="upload-text">${t('home.upload.drag')}</p>
        <p class="upload-hint">${t('home.upload.hint')}</p>
        <button class="btn-primary" onclick="event.stopPropagation();document.getElementById('file-input').click()">
          ${t('home.upload.select')}
        </button>
      </div>
    </div>`
  }

  function initUploadZone() {
    const zone = document.getElementById('upload-zone')
    const input = document.getElementById('file-input')
    if (!zone || !input) return
    zone.addEventListener('click', e => {
      if (!e.target.closest('button')) input.click()
    })
    zone.addEventListener('dragover', e => {
      e.preventDefault()
      zone.classList.add('drag-over')
    })
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over')
    })
    zone.addEventListener('drop', e => {
      e.preventDefault()
      zone.classList.remove('drag-over')
      const files = Array.from(e.dataTransfer.files)
      if (files.length) uploadFiles(files)
    })
    input.addEventListener('change', e => {
      const files = Array.from(e.target.files)
      if (files.length) uploadFiles(files)
      e.target.value = ''
    })
  }

  function uploadFiles(files) {
    files.forEach(uploadFile)
  }

  function uploadFile(file) {
    const id = `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const tx = {
      id,
      name: file.name,
      size: file.size,
      type: 'upload',
      progress: 0,
      speed: 0,
      done: false,
      error: null,
      fileRecord: null,
      _lastLoaded: 0,
      _lastTime: Date.now(),
    }
    state.activeUploads.push(tx)
    renderTransfers()

    const fd = new FormData()
    fd.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.addEventListener('progress', e => {
      if (!e.lengthComputable) return
      const now = Date.now(),
        elapsed = (now - tx._lastTime) / 1000
      if (elapsed >= 0.3) {
        tx.speed = (e.loaded - tx._lastLoaded) / elapsed
        tx._lastLoaded = e.loaded
        tx._lastTime = now
      }
      tx.progress = (e.loaded / e.total) * 100
      renderTransfers()
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        tx.done = true
        tx.progress = 100
        if (res.files?.[0]) tx.fileRecord = res.files[0]
        showToast(t('toast.upload_success'), 'success')
      } else {
        tx.error = `${t('toast.upload_error')} (${xhr.status})`
        showToast(tx.error, 'error')
      }
      renderTransfers()
    })

    xhr.addEventListener('error', () => {
      tx.error = t('toast.upload_error')
      showToast(tx.error, 'error')
      renderTransfers()
    })
    xhr.send(fd)
  }

  // ─── Remote Download ─────────────────────────────────────────────────────────
  function remoteFormHTML() {
    return `<div class="remote-form">
      <div class="input-group">
        <div class="url-input-wrapper">
          <input type="text" id="remote-url" placeholder="${t('home.remote.placeholder')}"
            class="url-input" oninput="detectUrlType(this.value)"
            onkeydown="if(event.key==='Enter')startRemoteDownload()">
          <span class="url-type-badge" id="url-badge">URL</span>
        </div>
        <button class="btn-primary" onclick="startRemoteDownload()">
          ${ico.download} ${t('home.remote.btn')}
        </button>
      </div>
      <p class="remote-hint">${t('home.remote.hint')}</p>
    </div>`
  }

  function detectUrlType(url) {
    const badge = document.getElementById('url-badge')
    if (!badge) return
    if (url.startsWith('magnet:')) {
      badge.className = 'url-type-badge type-magnet'
      badge.textContent = 'Magnet'
    } else if (/\.torrent(\?|$)/i.test(url) && url.startsWith('http')) {
      badge.className = 'url-type-badge type-torrent'
      badge.textContent = 'Torrent'
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      badge.className = 'url-type-badge type-http'
      badge.textContent = 'HTTP'
    } else {
      badge.className = 'url-type-badge'
      badge.textContent = 'URL'
    }
  }

  async function startRemoteDownload() {
    const urlInput = document.getElementById('remote-url')
    const url = urlInput?.value?.trim()
    if (!url) {
      showToast(t('toast.url_required'), 'warning')
      return
    }

    const type = url.startsWith('magnet:')
      ? 'magnet'
      : /\.torrent(\?|$)/i.test(url)
        ? 'torrent'
        : 'http'
    const id = `dl_${Date.now()}`
    const tx = {
      id,
      jobId: null,
      url,
      name: url.length > 55 ? url.slice(0, 52) + '...' : url,
      type,
      progress: 0,
      speed: 0,
      eta: 0,
      total: 0,
      done: false,
      error: null,
      fileRecord: null,
    }
    state.activeDownloads.push(tx)
    renderTransfers()
    if (urlInput) urlInput.value = ''
    detectUrlType('')

    try {
      const r = await fetch('/api/remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: 'Failed' }))
        throw new Error(e.error || 'Failed')
      }
      const { jobId } = await r.json()
      tx.jobId = jobId

      const es = new EventSource(`/api/remote/progress/${jobId}`)
      es.onmessage = e => {
        const d = JSON.parse(e.data)
        Object.assign(tx, {
          progress: d.progress || 0,
          speed: d.speed || 0,
          eta: d.eta || 0,
          total: d.total || 0,
        })
        if (d.status === 'done') {
          tx.done = true
          tx.progress = 100
          if (d.fileRecord) tx.fileRecord = d.fileRecord
          es.close()
          showToast(t('toast.download_success'), 'success')
        }
        if (d.status === 'error') {
          tx.error = d.error || t('toast.download_error')
          es.close()
          showToast(tx.error, 'error')
        }
        renderTransfers()
      }
      es.onerror = () => {
        if (!tx.done && !tx.error) {
          tx.error = t('toast.connection_error')
          showToast(tx.error, 'error')
          renderTransfers()
        }
        es.close()
      }
    } catch (err) {
      tx.error = err.message
      showToast(err.message, 'error')
      renderTransfers()
    }
  }

  // ─── Transfer Cards ───────────────────────────────────────────────────────────
  function renderTransfers() {
    const el = document.getElementById('active-transfers')
    if (!el) return
    const all = [...state.activeUploads, ...state.activeDownloads]
    if (!all.length) {
      el.innerHTML = ''
      return
    }

    const typeLabel = {
      upload: t('transfer.type.upload'),
      http: 'HTTP',
      magnet: 'Magnet',
      torrent: 'BT',
    }

    el.innerHTML = `
      <p class="section-title" style="margin-top:2rem">${t('home.transfers.title')}</p>
      <div class="transfers-list">
        ${all
          .map(tx => {
            let body = ''
            if (tx.error) {
              body = `<div class="tx-error">${ico.alert} ${esc(tx.error)}</div>`
            } else if (tx.done) {
              const shareUrl = tx.fileRecord ? `${location.origin}/share/${tx.fileRecord.id}` : null
              body = `<div class="tx-done">
              <span class="badge badge-success">✓ ${t('transfer.done')}</span>
              ${
                shareUrl
                  ? `<div class="share-link-row">
                <input type="text" readonly value="${esc(shareUrl)}" class="share-link-input">
                <button class="btn-sm btn-outline" onclick="copyText('${esc(shareUrl)}')">${t('common.copy')}</button>
                <a href="${esc(shareUrl)}" target="_blank" class="btn-sm btn-outline">↗</a>
              </div>`
                  : ''
              }
            </div>`
            } else {
              const pct = tx.progress ? `${tx.progress.toFixed(1)}%` : '...'
              body = `<div class="progress-wrapper">
              <div class="progress-bar"><div class="progress-fill" style="width:${tx.progress}%"></div></div>
              <div class="progress-stats">
                <span>${pct}</span>
                ${tx.speed > 0 ? `<span>${fmtSpeed(tx.speed)}</span>` : ''}
                ${tx.eta > 0 ? `<span>ETA ${fmtEta(tx.eta)}</span>` : ''}
                ${tx.total > 0 ? `<span>${fmtSize(tx.total)}</span>` : ''}
              </div>
            </div>`
            }
            return `<div class="tx-card${tx.done ? ' done' : ''}${tx.error ? ' error' : ''}">
            <div class="tx-header">
              <div class="tx-info">
                <span class="tx-type-badge">${typeLabel[tx.type] || tx.type}</span>
                <span class="tx-name" title="${esc(tx.name)}">${esc(tx.name)}</span>
                ${tx.size ? `<span class="tx-size">${fmtSize(tx.size)}</span>` : ''}
              </div>
              ${tx.done || tx.error ? `<button class="close-btn" onclick="removeTx('${tx.id}')" title="${t('common.close')}">×</button>` : ''}
            </div>
            ${body}
          </div>`
          })
          .join('')}
      </div>`
  }

  function removeTx(id) {
    state.activeUploads = state.activeUploads.filter(t => t.id !== id)
    state.activeDownloads = state.activeDownloads.filter(t => t.id !== id)
    renderTransfers()
  }

  // ─── File Manager Tab ────────────────────────────────────────────────────────
  let _searchTimer = null
  function debounceSearch() {
    clearTimeout(_searchTimer)
    _searchTimer = setTimeout(loadFileList, 280)
  }

  async function loadFileList() {
    const el = document.getElementById('files-container')
    if (!el) return
    const search = document.getElementById('file-search')?.value || ''
    const sortBy = document.getElementById('sort-by')?.value || 'uploadedAt'
    const sortDir = document.getElementById('sort-dir')?.value || 'desc'
    const params = new URLSearchParams({ search, sortBy, sortDir })

    // Inject toolbar if not yet rendered
    const pane = document.querySelector('.files-tab-pane')
    if (pane && !document.getElementById('file-search')) {
      pane.innerHTML = `
        <div class="files-toolbar" style="margin-bottom:1.25rem">
          <div class="search-wrapper">
            <span class="search-icon">${ico.search}</span>
            <input type="text" id="file-search" class="search-input" placeholder="${t('files.search')}"
              oninput="debounceSearch(); updateClearBtn('file-search')">
            <button class="search-clear" id="file-search-clear" onclick="clearInput('file-search', debounceSearch)" style="display:none">${ico.clear}</button>
          </div>
          <div class="sort-options">
            <label>${t('files.sort.label')}</label>
            <select id="sort-by" class="select" onchange="loadFileList()">
              <option value="uploadedAt">${t('files.sort.date')}</option>
              <option value="size">${t('files.sort.size')}</option>
              <option value="originalName">${t('files.sort.name')}</option>
              <option value="downloads">${t('files.sort.downloads')}</option>
            </select>
            <select id="sort-dir" class="select" onchange="loadFileList()">
              <option value="desc">${t('files.sort.desc')}</option>
              <option value="asc">${t('files.sort.asc')}</option>
            </select>
          </div>
        </div>
        <div id="files-container"><div class="loading">${t('common.loading')}</div></div>`
    }

    const container = document.getElementById('files-container')
    if (!container) return

    try {
      const r = await fetch(`/api/files?${params}`)
      if (r.status === 401) {
        state.authenticated = false
        renderAdminPage()
        return
      }
      const { files = [] } = await r.json()

      if (!files.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">${ico.inbox}</div>
          <p>${t('files.empty')}</p>
          <button class="btn-primary" style="margin-top:1rem" onclick="switchAdminTab('upload')">${ico.uploadSm} ${t('files.empty_action')}</button>
        </div>`
        return
      }

      const sourceLabel = {
        upload: t('files.source.upload'),
        remote: t('files.source.remote'),
        torrent: t('files.source.torrent'),
      }

      container.innerHTML = `
        <div class="file-list">
          ${files
            .map(
              f => `
            <div class="file-item">
              <div class="file-icon">${fileIcon(f.mimeType)}</div>
              <div class="file-info">
                <div class="file-name" title="${esc(f.originalName)}">${esc(f.originalName)}</div>
                <div class="file-meta">
                  <span>${fmtSize(f.size)}</span><span>·</span>
                  <span>${sourceLabel[f.source] || f.source}</span><span>·</span>
                  <span>${fmtRelDate(f.uploadedAt)}</span><span>·</span>
                  <span>${f.downloads} ${t('files.downloads')}</span>
                </div>
              </div>
              <div class="file-actions">
                <button class="btn-sm btn-outline" title="${t('files.actions.copy')}"
                  onclick="copyText('${location.origin}/share/${f.id}')">${ico.link}</button>
                <button class="btn-sm btn-outline" title="${t('files.actions.rename')}"
                  onclick="renameFile('${f.id}','${esc(f.originalName)}')">${ico.edit}</button>
                <button class="btn-sm btn-danger" title="${t('files.actions.delete')}"
                  onclick="deleteFile('${f.id}')">${ico.trash}</button>
              </div>
            </div>`
            )
            .join('')}
        </div>
        <div class="files-footer">${files.length} ${t('files.count')}</div>`
    } catch (err) {
      if (container) container.innerHTML = `<div class="error-state">${esc(err.message)}</div>`
    }
  }

  function renameFile(id, currentName) {
    showModal({
      title: t('modal.rename.title'),
      body: `<input type="text" id="rename-input" class="input" value="${esc(currentName)}">`,
      confirmText: t('modal.rename.confirm'),
      onConfirm: async () => {
        const name = document.getElementById('rename-input')?.value?.trim()
        if (!name) return
        const r = await fetch(`/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalName: name }),
        })
        if (r.ok) {
          showToast(t('toast.rename_success'), 'success')
          loadFileList()
        } else {
          const d = await r.json()
          showToast(d.error || 'Error', 'error')
        }
      },
    })
  }

  function deleteFile(id) {
    showModal({
      title: t('modal.delete.title'),
      body: `<p style="color:var(--text-secondary)">${t('modal.delete.body')}</p>`,
      confirmText: t('modal.delete.confirm'),
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        const r = await fetch(`/api/files/${id}`, { method: 'DELETE' })
        if (r.ok) {
          showToast(t('toast.delete_success'), 'success')
          loadFileList()
        } else {
          const d = await r.json()
          showToast(d.error || 'Error', 'error')
        }
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  async function renderSharePage(id) {
    const content = document.getElementById('main-content')
    content.innerHTML = `<div class="share-container container"><div class="card share-card"><div class="loading">${t('common.loading')}</div></div></div>`

    try {
      const r = await fetch(`/api/share/${id}`)
      if (!r.ok) {
        document.title = 'File-Du — Not Found'
        content.innerHTML = `<div class="share-container container">
          <div class="card share-card not-found">
            <div class="share-icon">${ico.fileX}</div>
            <h2>${t('share.not_found')}</h2>
            <p style="color:var(--text-secondary);margin:.75rem 0 2rem">${t('share.not_found_sub')}</p>
            <a href="/" onclick="event.preventDefault();navigate('/')" class="btn-primary">${t('share.go_home')}</a>
          </div></div>`
        return
      }

      const f = await r.json()
      document.title = `${f.originalName} — File-Du`
      const srcLabel = {
        upload: t('files.source.upload'),
        remote: t('files.source.remote'),
        torrent: t('files.source.torrent'),
      }

      content.innerHTML = `<div class="share-container container">
        <div class="card share-card">
          <div class="share-file-icon">${fileIcon(f.mimeType)}</div>
          <h1 class="share-filename">${esc(f.originalName)}</h1>
          <div class="share-meta">
            <div class="share-meta-item"><span class="meta-label">${t('share.size')}</span><span class="meta-value">${fmtSize(f.size)}</span></div>
            <div class="share-meta-item"><span class="meta-label">${t('share.type')}</span><span class="meta-value">${esc(f.mimeType)}</span></div>
            <div class="share-meta-item"><span class="meta-label">${t('share.uploaded')}</span><span class="meta-value">${fmtDate(f.uploadedAt)}</span></div>
            <div class="share-meta-item"><span class="meta-label">${t('share.downloads')}</span><span class="meta-value">${f.downloads}</span></div>
            <div class="share-meta-item"><span class="meta-label">${t('share.source')}</span><span class="meta-value">${srcLabel[f.source] || f.source}</span></div>
          </div>
          <a href="/api/download/${f.id}" class="btn-primary btn-large" style="margin-top:.5rem">
            ${ico.download} ${t('share.download_btn')}
          </a>
        </div>
      </div>`
    } catch (err) {
      content.innerHTML = `<div class="error-state">${esc(err.message)}</div>`
    }
  }

  // ─── Modal ───────────────────────────────────────────────────────────────────
  let _onConfirm = null

  function showModal({ title, body, confirmText, confirmClass, onConfirm }) {
    _onConfirm = onConfirm
    document.getElementById('modal').innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="icon-btn close-btn" onclick="closeModal()" style="width:28px;height:28px">×</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="${confirmClass || 'btn-primary'}" onclick="confirmModal()">${confirmText || t('common.confirm')}</button>
      </div>`
    document.getElementById('modal-overlay').classList.remove('hidden')
    setTimeout(() => {
      const inp = document.querySelector('#modal input')
      if (inp) {
        inp.focus()
        inp.select()
      }
    }, 80)
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden')
    _onConfirm = null
  }
  async function confirmModal() {
    if (_onConfirm) {
      await _onConfirm()
      closeModal()
    }
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info', duration = 3500) {
    const c = document.getElementById('toast-container')
    const id = `t_${Date.now()}`
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'i' }
    const el = document.createElement('div')
    el.className = `toast toast-${type}`
    el.id = id
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'i'}</span><span class="toast-message">${esc(message)}</span><button class="toast-close" onclick="removeToast('${id}')">×</button>`
    c.appendChild(el)
    setTimeout(() => el.classList.add('toast-show'), 10)
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id) {
    const el = document.getElementById(id)
    if (!el) return
    el.classList.remove('toast-show')
    setTimeout(() => el.remove(), 300)
  }

  // ─── Global Exposure ─────────────────────────────────────────────────────────
  Object.assign(window, {
    navigate,
    toggleTheme,
    toggleLang,
    togglePasswordVisibility,
    clearInput,
    updateClearBtn,
    logout,
    submitLogin,
    switchAdminTab,
    detectUrlType,
    startRemoteDownload,
    loadPublicFiles,
    debouncePublicSearch,
    loadFileList,
    debounceSearch,
    renameFile,
    deleteFile,
    copyText,
    removeTx,
    removeToast,
    closeModal,
    confirmModal,
  })

  // ─── Bootstrap ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    applyTheme()
    await checkAuth()
    renderNav()
    route()

    window.addEventListener('popstate', route)
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal()
    })
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal()
    })
  })
})()
