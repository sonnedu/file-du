/**
 * File-Du Internationalization
 * Supports: zh (简体中文) | en (English)
 */

const translations = {
  zh: {
    nav: {
      home: '首页',
      admin: '管理后台',
      theme: '切换主题',
      logout: '退出',
    },
    home: {
      list: {
        title: '文件下载',
        sub: '点击下方文件即可下载，无需登录',
      },
      tabs: {
        upload: '上传文件',
        remote: '远程/磁力',
      },
      upload: {
        drag: '拖拽文件到此处，或点击选择',
        hint: '支持任意格式 · 单文件最大 8GB',
        select: '选择文件',
      },
      remote: {
        placeholder: '输入 URL、磁力链接(magnet:) 或 .torrent 文件地址',
        btn: '开始下载',
        hint: '支持 HTTP/HTTPS 直链 · 磁力链接 · .torrent 种子文件 URL',
      },
      transfers: {
        title: '传输中',
      },
    },
    admin: {
      title: '管理后台',
      tabs: {
        files: '文件管理',
      },
    },
    files: {
      title: '文件管理',
      search: '搜索文件名...',
      empty: '暂无文件，快去上传吧！',
      count: '个文件',
      downloads: '次下载',
      sort: {
        label: '排序：',
        date: '上传时间',
        size: '文件大小',
        name: '文件名',
        downloads: '下载次数',
        desc: '降序',
        asc: '升序',
      },
      source: {
        upload: '直传',
        remote: '远程',
        torrent: 'BT',
      },
      actions: {
        copy: '复制链接',
        rename: '重命名',
        delete: '删除',
      },
    },
    login: {
      title: '需要验证',
      sub: '文件管理页面已加密保护',
      placeholder: '输入管理密码',
      btn: '验证',
      error: '密码错误，请重试',
    },
    share: {
      not_found: '文件不存在',
      not_found_sub: '该文件已被删除或链接失效',
      go_home: '返回首页',
      size: '文件大小',
      type: '文件类型',
      uploaded: '上传时间',
      downloads: '下载次数',
      source: '来源',
      download_btn: '下载文件',
    },
    transfer: {
      type: {
        upload: '上传',
        http: 'HTTP',
        magnet: '磁力',
        torrent: 'BT',
      },
      done: '完成',
    },
    modal: {
      rename: {
        title: '重命名文件',
        confirm: '保存',
      },
      delete: {
        title: '删除文件',
        body: '此操作不可撤销，确认删除？',
        confirm: '确认删除',
      },
    },
    common: {
      cancel: '取消',
      confirm: '确认',
      copy: '复制',
      close: '关闭',
      loading: '加载中...',
    },
    toast: {
      upload_success: '文件上传成功！',
      upload_error: '上传失败',
      download_success: '下载完成！',
      download_error: '下载失败',
      connection_error: '连接断开',
      url_required: '请输入下载地址',
      copied: '已复制到剪贴板',
      rename_success: '重命名成功',
      delete_success: '文件已删除',
    },
    page: {
      home: { title: '文件中转' },
      files: { title: '文件管理' },
      share: { title: '文件下载' },
    },
  },

  en: {
    nav: {
      home: 'Home',
      admin: 'Admin',
      theme: 'Toggle theme',
      logout: 'Logout',
    },
    home: {
      list: {
        title: 'Downloads',
        sub: 'Click any file to download — no login required',
      },
      tabs: {
        upload: 'Upload',
        remote: 'Remote / Magnet',
      },
      upload: {
        drag: 'Drag files here, or click to select',
        hint: 'Any format · Max 8GB per file',
        select: 'Choose Files',
      },
      remote: {
        placeholder: 'Paste URL, magnet:// link, or .torrent URL',
        btn: 'Start Download',
        hint: 'Supports HTTP/HTTPS · Magnet links · .torrent file URLs',
      },
      transfers: {
        title: 'Active Transfers',
      },
    },
    admin: {
      title: 'Admin Panel',
      tabs: {
        files: 'File Manager',
      },
    },
    files: {
      title: 'File Manager',
      search: 'Search files...',
      empty: 'No files yet. Upload something!',
      count: 'files',
      downloads: 'downloads',
      sort: {
        label: 'Sort:',
        date: 'Date',
        size: 'Size',
        name: 'Name',
        downloads: 'Downloads',
        desc: 'Desc',
        asc: 'Asc',
      },
      source: {
        upload: 'Upload',
        remote: 'Remote',
        torrent: 'BT',
      },
      actions: {
        copy: 'Copy link',
        rename: 'Rename',
        delete: 'Delete',
      },
    },
    login: {
      title: 'Authentication Required',
      sub: 'The file manager is password protected',
      placeholder: 'Enter admin password',
      btn: 'Sign In',
      error: 'Incorrect password, please try again',
    },
    share: {
      not_found: 'File Not Found',
      not_found_sub: 'This file has been deleted or the link has expired',
      go_home: 'Go Home',
      size: 'File Size',
      type: 'File Type',
      uploaded: 'Uploaded',
      downloads: 'Downloads',
      source: 'Source',
      download_btn: 'Download File',
    },
    transfer: {
      type: {
        upload: 'Upload',
        http: 'HTTP',
        magnet: 'Magnet',
        torrent: 'BT',
      },
      done: 'Done',
    },
    modal: {
      rename: {
        title: 'Rename File',
        confirm: 'Save',
      },
      delete: {
        title: 'Delete File',
        body: 'This action cannot be undone. Confirm delete?',
        confirm: 'Delete',
      },
    },
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      copy: 'Copy',
      close: 'Close',
      loading: 'Loading...',
    },
    toast: {
      upload_success: 'Upload successful!',
      upload_error: 'Upload failed',
      download_success: 'Download complete!',
      download_error: 'Download failed',
      connection_error: 'Connection lost',
      url_required: 'Please enter a URL',
      copied: 'Copied to clipboard!',
      rename_success: 'File renamed',
      delete_success: 'File deleted',
    },
    page: {
      home: { title: 'Transfer' },
      files: { title: 'File Manager' },
      share: { title: 'Download File' },
    },
  },
}

// Simple dot-notation key resolver
function t(key, lang = 'zh') {
  const keys = key.split('.')
  let obj = translations[lang] || translations.zh
  for (const k of keys) {
    obj = obj?.[k]
    if (obj === undefined) return key
  }
  return obj || key
}

window.i18n = { t, translations }
