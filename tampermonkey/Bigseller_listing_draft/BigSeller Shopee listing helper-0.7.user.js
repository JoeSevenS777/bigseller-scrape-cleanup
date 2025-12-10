// ==UserScript==
// @name         BigSeller Shopee Title Prefix Helper
// @namespace    https://joe.bigseller.helper
// @version      0.95
// @description  Shopee listing helper on BigSeller: title prefixes, description templates, SKU normalize, MD5, and variant name conversion.
// @match        https://www.bigseller.pro/web/listing/shopee/edit/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ===================== CONFIG =====================
  const STORE_CONFIG = {
    '墨墨優選': {
      titlePrefix: '🎀台灣現貨🎀',
      descPrefix: `📢📢📢按贊優先出貨❗
💕💕關注本本賣場可立即獲得20元優惠劵
`,
      descSuffix: `
🎀【下標小TIPS】:

小店致力於服務好每個買家，給每个買家最好的商品體驗！
所有商品皆有現貨 , 不用詢問可立刻下單
有問題希望買家聊聊聯繫小編處理，不要著急負評。經營不易！請您包涵！

⚠️【注意事項】

如為商品本身瑕疵，請於收貨當日聯絡我們，謝謝您
辦理退換貨時，如有贈品或配件，請一併寄回，否則視為缺件無法受理，請您理解
圖片僅供參考，受不同拍攝光線、顯示器等影響，會存在一定的色差，特別介意的寶寶請謹慎購買喔`
    },
    '學姐艾美麗': {
      titlePrefix: '💕台灣現貨💕',
      descPrefix: `📢按讚客戶優先安排出貨！​
💝關注店鋪立得 20 元優惠券！
`,
      descSuffix: `
購物指南：​

✅全店商品現貨秒發，下單無需等待！​
✅有疑問隨時私信小編，溝通解決不負評～​

售後須知：​

🔔商品瑕疵請於簽收當日聯繫處理；​
🔔退換貨時，贈品配件需一同寄回；​
🔔因拍攝、顯示差異，商品存在輕微色差，介意慎拍。`
    },
    '4店': {
      titlePrefix: '💄台灣現貨💄',
      descPrefix: `📢按讚加碼，出貨快人一步！​
💞關注店鋪秒領 20 元購物券！​
`,
      descSuffix: `
購物說明：​

✅全品現貨，即拍即發；​
✅有需求隨時溝通，小編全力服務！
​

售後提醒：​

❗商品瑕疵請當日聯繫處理；​
❗退換貨時，請將贈品配件一同寄回；​
❗因拍攝、顯示設備不同，存在色差屬正常現象。`
    },
    'emmacoleman432': {
      titlePrefix: '💋 台灣現貨💋',
      descPrefix: `📢按讚客戶優先安排出貨！​
💝關注店鋪立得 20 元優惠券！
`,
      descSuffix: `
購物指引：

✅實時現貨，下單即發；​
✅有問題歡迎私信，小編在線答疑！​

溫馨提示：​

⚠️商品問題請於收貨當日反饋；​
⚠️退換貨需附齊贈品配件；​
⚠️圖片與實物存在色差，以實物為準。`
    },
  };

  const LABEL_SHOP = '店铺';
  const LABEL_TITLE = '产品名称';

  // ===================== UTILITIES =====================

  const SIMPLE_TO_TRAD = {
    '烟': '煙',
    '乌': '烏',
    '蓝': '藍',
    '绿': '綠',
    '黄': '黃',
    '红': '紅',
    '发': '髮',
    '后': '後',
    '爱': '愛',
    '妈': '媽',
    '鱼': '魚',
    '鸟': '鳥',
    '气': '氣',
    '云': '雲',
    '阴': '陰',
    '阳': '陽',
    '台': '臺',
    '蔷': '薔',
  };
  // 反向映射：繁體 -> 簡體，用於 SKU 前綴統一為簡體
  const TRAD_TO_SIMP = {};
  Object.keys(SIMPLE_TO_TRAD).forEach((simp) => {
    const trad = SIMPLE_TO_TRAD[simp];
    TRAD_TO_SIMP[trad] = simp;
  });

  let openccReady = false;
  let openccCn2Tw = null; // 简 -> 繁
  let openccTw2Cn = null; // 繁 -> 简

  function loadOpenCC() {
    // 如果已經有任何一個轉換器可用，就直接返回
    if ((openccCn2Tw && typeof openccCn2Tw === 'function') ||
        (openccTw2Cn && typeof openccTw2Cn === 'function')) {
      return Promise.resolve();
    }
    if (openccReady) {
      return Promise.resolve();
    }
    openccReady = true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js';
      script.onload = () => {
        try {
          if (window.OpenCC) {
            // 简体 -> 繁体
            openccCn2Tw = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
            // 繁体 -> 简体
            openccTw2Cn = window.OpenCC.Converter({ from: 'tw', to: 'cn' });
          }
        } catch (e) {
          console.warn('[Title Helper] OpenCC 初始化失败:', e);
        }
        resolve();
      };

      script.onerror = () => {
        console.warn('[Title Helper] OpenCC 脚本加载失败，使用简易映射作为降级');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function toSimplified(text) {
    const s = text || '';
    // 优先用 OpenCC 繁 -> 简
    if (openccTw2Cn && typeof openccTw2Cn === 'function') {
      try {
        return openccTw2Cn(s);
      } catch (e) {
        console.warn('[Title Helper] OpenCC 繁轉簡出錯，使用簡易映射:', e);
      }
    }
    // CDN 失敗時，用小字典做降級
    return s.split('').map((ch) => TRAD_TO_SIMP[ch] || ch).join('');
  }

  function toTraditional(text) {
    const s = text || '';
    // 优先用 OpenCC 简 -> 繁
    if (openccCn2Tw && typeof openccCn2Tw === 'function') {
      try {
        return openccCn2Tw(s);
      } catch (e) {
        console.warn('[Title Helper] OpenCC 簡轉繁出錯，使用簡易映射:', e);
      }
    }
    // 降級：用簡單對照表映射
    return s.split('').map((ch) => SIMPLE_TO_TRAD[ch] || ch).join('');
  }


  function textNormalize(str) {
    return (str || '').replace(/\s+/g, '').trim();
  }

  function findFieldByLabelText(labelText, preferSelectors) {
    const target = textNormalize(labelText);
    const labels = Array.from(
      document.querySelectorAll('label, .el-form-item__label, .ivu-form-item-label, .ant-form-item-label')
    );

    for (const label of labels) {
      const txt = textNormalize(label.textContent || '');
      if (!txt.includes(target)) continue;

      const item =
        label.closest('.el-form-item, .ivu-form-item, .ant-form-item, .form-group') || label.parentElement;
      if (!item) continue;

      const selectors =
        preferSelectors && preferSelectors.length ? preferSelectors.join(',') : 'input, select, textarea';

      const field = item.querySelector(selectors);
      if (field) return field;
    }

    const allFields = Array.from(document.querySelectorAll('input, select, textarea'));
    for (const field of allFields) {
      let parent = field.parentElement;
      while (parent && parent !== document.body) {
        const txt = textNormalize(parent.textContent || '');
        if (txt.includes(target)) return field;
        parent = parent.parentElement;
      }
    }

    return null;
  }

  function getShopName() {
    let rendered = null;

    const antContainers = Array.from(document.querySelectorAll('div[autoid="store_button"]'));
    for (const c of antContainers) {
      let r = c.querySelector('.ant-select-selection-selected-value');
      if (!r) {
        r = c.querySelector('.ant-select-selection__rendered');
      }
      if (r && textNormalize(r.textContent || '')) {
        rendered = r;
        break;
      }
    }

    if (!rendered) {
      const formItems = Array.from(document.querySelectorAll('.ant-form-item'));
      for (const item of formItems) {
        const labelEl = item.querySelector('.ant-form-item-label');
        if (!labelEl) continue;
        const labelText = textNormalize(labelEl.textContent || '');
        if (!labelText.includes(LABEL_SHOP)) continue;
        let r = item.querySelector('.ant-select-selection-selected-value');
        if (!r) {
          r = item.querySelector('.ant-select-selection__rendered');
        }
        if (r && textNormalize(r.textContent || '')) {
          rendered = r;
          break;
        }
      }
    }

    if (rendered) {
      const name = textNormalize(rendered.textContent || '');
      if (!name || name.includes('请选择')) return '';
      return name;
    }

    const shopField = findFieldByLabelText(LABEL_SHOP, ['select', 'input']);
    if (shopField) {
      if (shopField.tagName === 'SELECT') {
        const opt = shopField.options[shopField.selectedIndex];
        return (opt && opt.textContent.trim()) || '';
      }
      return (shopField.value || '').trim();
    }

    return '';
  }

  function getTitleField() {
    // 0) 直接根據 BigSeller 的 autoid 尋找
    const direct = document.querySelector('input[autoid="product_name_text"]');
    if (direct) return direct;

    // 1) 優先用標籤文字匹配
    const LABEL_CANDIDATES = [
      LABEL_TITLE,
      '商品标题',
      '商品標題',
      '商品名稱',
      '商品名称',
      '產品標題',
      '產品名稱',
      '标题',
      '標題',
      'Product Name',
      '產品名稱 (Product Name)'
    ];

    for (const lab of LABEL_CANDIDATES) {
      const byLabel = findFieldByLabelText(lab, ['input', 'textarea']);
      if (byLabel) return byLabel;
    }

    // 2) 使用跨 document / iframe 的 text 欄位集合
    const textInputs = getAllTextFields();

    // 2a) 優先選擇 placeholder / aria-label 帶有「標題」等字樣的
    const byPlaceholder = textInputs.find((el) => {
      const ph = (el.getAttribute('placeholder') || '').trim();
      const aria = (el.getAttribute('aria-label') || '').trim();
      const txt = ph + ' ' + aria;
      return /標題|标题|商品名稱|商品名称|產品名稱|產品名称|Product Name/i.test(txt);
    });
    if (byPlaceholder) return byPlaceholder;

    // 2b) 再根據可見性 + maxLength 推斷：Shopee 標題通常較長且在頁面上方
    const visible = textInputs.filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.top > window.innerHeight * 0.7) return false; // 太靠下的先排除
      const ml = el.maxLength;
      return ml === -1 || ml >= 60; // 標題一般有較大的 maxLength
    });

    if (visible.length) {
      // 嘗試優先選擇 maxLength 接近 Shopee 標題（例如 120）者
      visible.sort((a, b) => {
        const ma = a.maxLength || 9999;
        const mb = b.maxLength || 9999;
        const da = Math.abs(ma - 120);
        const db = Math.abs(mb - 120);
        return da - db;
      });
      return visible[0];
    }

    // 3) 最後退而求其次：挑第一個較長的 text 欄位當作標題
    const longInput = textInputs.find((el) => {
      const ml = el.maxLength;
      return ml === -1 || ml >= 80;
    }) || textInputs.find((el) => {
      const ml = el.maxLength;
      return ml === -1 || ml >= 50;
    });

    return longInput || null;
  }


  function getParentSkuInput() {
    let input = document.querySelector('input[autoid="parent_sku_text"]');
    if (input) return input;

    input = findFieldByLabelText('父SKU', ['input']) || findFieldByLabelText('主SKU', ['input']);
    if (input) return input;

    const candidates = Array.from(document.querySelectorAll('input[type="text"]'));
    input = candidates.find((el) => {
      const id = el.id || '';
      const name = el.name || '';
      const autoid = el.getAttribute('autoid') || '';
      return /parent[_-]?sku/i.test(id) || /parent[_-]?sku/i.test(name) || /parent[_-]?sku/i.test(autoid);
    });

    return input || null;
  }

  // Small async helper
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Collect ALL text-like fields (main doc + same-origin iframes)
  function getAllTextFields() {
    const result = [];
    function collect(doc) {
      try {
        const fields = Array.from(doc.querySelectorAll('input[type="text"], textarea'));
        result.push(...fields);
        const iframes = Array.from(doc.querySelectorAll('iframe'));
        iframes.forEach((iframe) => {
          try {
            if (iframe.contentDocument) {
              collect(iframe.contentDocument);
            }
          } catch (e) {
            // cross-origin, ignore
          }
        });
      } catch (e) {
        // safety net
      }
    }
    collect(document);
    return result;
  }

  // ===================== CHINESE SPACING =====================

  function isChineseChar(ch) {
    return /[\u4E00-\u9FFF]/.test(ch);
  }

  function chunkChineseSegment(seg) {
    const chars = Array.from(seg);
    const chunks = [];
    const PRODUCT_SUFFIXES = [
      '口红', '口紅', '唇彩', '唇釉', '唇膏',
      '粉底液', '粉底膏', '粉饼', '粉餅', '气垫', '氣墊',
      '腮红', '腮紅', '遮瑕', '遮瑕膏',
      '睫毛膏', '眉笔', '眉筆', '眼线笔', '眼線筆',
      '彩妆', '彩妝'
    ];

    let i = 0;
    while (i < chars.length) {
      const remaining = chars.length - i;
      let size;
      if (remaining <= 6) {
        size = remaining;
      } else {
        if (remaining - 4 === 1) {
          size = 5;
        } else if (remaining - 4 === 2) {
          if (remaining - 6 >= 3) {
            size = 6;
          } else {
            size = 4;
          }
        } else {
          size = 4;
        }
      }

      if (i + size + 2 <= chars.length) {
        const maybeSuffix = chars.slice(i + size, i + size + 2).join('');
        if (PRODUCT_SUFFIXES.includes(maybeSuffix)) {
          size += 2;
        }
      }

      chunks.push(chars.slice(i, i + size).join(''));
      i += size;
    }
    return chunks;
  }

  function smartSpaceChinese(title) {
    if (!title) return '';
    const trimmed = title.trim();

    let brand = '';
    let rest = trimmed;
    const brandMatch = trimmed.match(/^[A-Za-z][A-Za-z0-9\s&-]*/);
    if (brandMatch) {
      brand = brandMatch[0].trim();
      rest = trimmed.slice(brandMatch[0].length);
    }

    const tokens = [];
    if (brand) tokens.push(brand);

    let buffer = '';
    let currentType = null;

    function flush() {
      if (!buffer) return;
      if (currentType === 'C') {
        const segChunks = chunkChineseSegment(buffer);
        tokens.push(...segChunks);
      } else {
        const t = buffer.trim();
        if (t) tokens.push(t);
      }
      buffer = '';
      currentType = null;
    }

    for (const ch of rest) {
      if (ch === ' ') {
        flush();
        continue;
      }
      const type = isChineseChar(ch) ? 'C' : 'O';
      if (currentType && type !== currentType) {
        flush();
      }
      currentType = type;
      buffer += ch;
    }
    flush();

    return tokens.filter(Boolean).join(' ');
  }

  // ===================== DESCRIPTION HELPERS =====================

  function getStoreConfig(storeNameOverride) {
    const actualShopName = getShopName();
    const effectiveStore = storeNameOverride || actualShopName;
    return STORE_CONFIG[effectiveStore] || STORE_CONFIG['墨墨優選'];
  }

  function getAllDescriptionTemplates() {
    const prefixes = [];
    const suffixes = [];
    Object.values(STORE_CONFIG).forEach((cfg) => {
      if (cfg.descPrefix) prefixes.push(cfg.descPrefix);
      if (cfg.descSuffix) suffixes.push(cfg.descSuffix);
    });
    return { prefixes, suffixes };
  }

  function getDescriptionField() {
    const ckIframe = document.querySelector('iframe.cke_wysiwyg_frame');
    if (ckIframe && ckIframe.contentDocument && ckIframe.contentDocument.body) {
      return ckIframe.contentDocument.body;
    }

    const viaLabel = findFieldByLabelText('产品描述', ['textarea']);
    if (viaLabel) return viaLabel;

    const aiSpan = document.querySelector(
      'span[title*="产品描述"], span[title*="產品描述"], span[title*="生成产品描述"], span[title*="生成產品描述"]'
    );
    if (aiSpan) {
      const item =
        aiSpan.closest('.page_edit_item') ||
        aiSpan.closest('.com_card_body') ||
        aiSpan.closest('.com_card') ||
        aiSpan.closest('form') ||
        aiSpan.parentElement;

      if (item) {
        let editable = item.querySelector('textarea, [contenteditable="true"], .ql-editor');
        if (editable) return editable;

        const contentDiv = item.querySelector('.content');
        if (contentDiv) {
          editable = contentDiv.querySelector('textarea, [contenteditable="true"], .ql-editor');
          if (editable) return editable;
          return contentDiv;
        }
      }
    }

    const titleNodes = Array.from(
      document.querySelectorAll('.chat_pull_left.title, .page_edit_item .title, .com_card_head .title, .com_card_head')
    );
    for (const node of titleNodes) {
      const text = (node.textContent || '').trim();
      if (!text.includes('产品描述') && !text.includes('產品描述')) continue;
      const container =
        node.closest('.page_edit_item')?.querySelector('.content') ||
        node.parentElement?.querySelector('.content');
      if (container) {
        const editable = container.querySelector('textarea, [contenteditable="true"], .ql-editor');
        if (editable) return editable;
        return container;
      }
    }

    console.warn('[Shopee Helper] 无法定位产品描述编辑框');
    return null;
  }

  function applyDescriptionForStore(storeNameOverride) {
    const field = getDescriptionField();
    if (!field) return;

    const cfg = getStoreConfig(storeNameOverride);
    const CURRENT_PREFIX = cfg.descPrefix || '';
    const CURRENT_SUFFIX = cfg.descSuffix || '';
    const { prefixes: ALL_PREFIXES, suffixes: ALL_SUFFIXES } = getAllDescriptionTemplates();

    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      let text = field.value || '';

      for (let i = 0; i < 5; i++) {
        const before = text;
        ALL_PREFIXES.forEach((p) => {
          if (p) text = text.replace(p, '');
        });
        ALL_SUFFIXES.forEach((s) => {
          if (s) text = text.replace(s, '');
        });
        if (before === text) break;
      }

      text = text.trim();
      const merged = CURRENT_PREFIX + text + (text ? '\n' : '') + CURRENT_SUFFIX;

      field.value = merged;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const doc = field.ownerDocument || document;
    const imgs = field.querySelectorAll('img');
    let middleHtml = '';

    if (imgs.length) {
      const range = doc.createRange();
      range.setStartBefore(imgs[0]);
      range.setEndAfter(imgs[imgs.length - 1]);
      const frag = range.cloneContents();
      const temp = doc.createElement('div');
      temp.appendChild(frag);
      middleHtml = (temp.innerHTML || '').trim();
    } else {
      middleHtml = (field.innerHTML || '').trim();
    }

    const prefixHtml = CURRENT_PREFIX.replace(/\n/g, '<br/>');
    const suffixHtml = CURRENT_SUFFIX.replace(/\n/g, '<br/>');
    const finalHtml =
      prefixHtml +
      '<br/>' +
      middleHtml +
      (middleHtml ? '<br/>' : '') +
      suffixHtml;

    field.innerHTML = finalHtml;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ===================== COLOR VARIANT HELPER (SKU转繁体) =====================

  async function convertColorOptionsToTraditional() {
    await loadOpenCC();

    // 掃描主 document + 所有同源 iframe + 所有 open shadowRoot，收集搜索根節點
    function collectSearchRoots() {
      const roots = [];
      const seen = new Set();
      const stack = [document];

      while (stack.length) {
        const node = stack.pop();
        if (!node || seen.has(node)) continue;
        seen.add(node);

        const isDoc = node.nodeType === 9; // Document
        const base = isDoc ? (node.body || node) : node; // ShadowRoot 直接當根
        if (base && typeof base.querySelectorAll === 'function') {
          roots.push(base);

          // 在當前樹中尋找所有 iframe -> 其 contentDocument 也入棧
          const iframes = Array.from(base.querySelectorAll('iframe'));
          for (const iframe of iframes) {
            try {
              if (iframe.contentDocument) stack.push(iframe.contentDocument);
            } catch (e) {
              // 跨域忽略
            }
          }

          // 掃描所有元素，若存在 shadowRoot，則將 shadowRoot 入棧
          const allEls = Array.from(base.querySelectorAll('*'));
          for (const el of allEls) {
            if (el.shadowRoot) {
              stack.push(el.shadowRoot);
            }
          }
        }
      }
      return roots;
    }

    const roots = collectSearchRoots();

    // 1) 在所有 roots 裡收集鉛筆按鈕 / 圖標
    const btnSet = new Set();

    const BTN_SELECTOR =
      'a.custom_item_edit, a[autoid^="variation_second_name_edit_"], i[autoid^="variation_second_name_edit_"]';

    for (const root of roots) {
      if (!root) continue;

      // 直接匹配鉛筆
      root.querySelectorAll(BTN_SELECTOR).forEach((el) => btnSet.add(el));

      // 從名稱 span 出發，再在同一行尋找按鈕，兼容 class 變動
      root
        .querySelectorAll('span[autoid^="variation_second_name_text_"]')
        .forEach((span) => {
          const row = span.closest('div') || span.parentElement;
          if (!row) return;
          const btn =
            row.querySelector(BTN_SELECTOR) ||
            row.querySelector('a, i');
          if (btn) btnSet.add(btn);
        });
    }

    const allButtons = Array.from(btnSet);

    if (!allButtons.length) {
      console.warn('[Title Helper] 未找到顏色/規格名稱的編輯按鈕 (custom_item_edit / bsicon_edit1)');
      return;
    }

    let processedCount = 0;

    for (const editBtn of allButtons) {
      // 點擊鉛筆，打開彈窗；使用元素所在的 root document/shadowRoot
      const rootNode = editBtn.getRootNode && editBtn.getRootNode();
      const docLike = rootNode && rootNode.querySelectorAll ? rootNode : document;

      editBtn.click();
      await sleep(220);

      // 彈窗：兼容不同樣式，只取最後一個（最新彈出的）
      const popupCandidates = Array.from(
        docLike.querySelectorAll('div.bs_antd_textarea_box.textareaBox, div.bs_antd_textarea_box')
      );
      const popup = popupCandidates[popupCandidates.length - 1];
      if (!popup) continue;

      const textarea =
        popup.querySelector('textarea.ant-input.bs_antd_textarea') ||
        popup.querySelector('textarea');
      if (!textarea) continue;

      const orig = (textarea.value || '').trim();
      if (!orig) {
        const okBtnEmpty =
          popup.querySelector('button.ant-btn.ant-btn-primary') ||
          popup.querySelector('button');
        if (okBtnEmpty) okBtnEmpty.click();
        await sleep(140);
        continue;
      }

      // 若包含色號編碼，如 "CP365-01#蔷薇烟"，先規整為 "01#蔷薇烟"
      let simplified = orig;
      const hashIndex = simplified.indexOf('#');
      if (hashIndex !== -1) {
        const beforeHash = simplified.slice(0, hashIndex); // 例如 "CP365-01"
        const afterHash = simplified.slice(hashIndex + 1); // 例如 "蔷薇烟"
        let code = beforeHash;
        const dashIdx = code.indexOf('-');
        if (dashIdx !== -1) {
          code = code.slice(dashIdx + 1); // 只保留 "01"
        }
        simplified = code + '#' + afterHash;
      }

      const converted = toTraditional(simplified);

      if (converted && converted !== orig) {
        textarea.value = converted;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        processedCount++;
      }

      const okBtn =
        popup.querySelector('button.ant-btn.ant-btn-primary') ||
        popup.querySelector('div.btn_box button') ||
        popup.querySelector('button');
      if (okBtn) okBtn.click();

      await sleep(180);
    }

    console.log('[Title Helper] SKU轉繁體已完成，處理欄位數量:', processedCount);
  }

  // ===================== SKU NORMALIZATION =====================

  async function updateSkuWithParent(parentSku) {
    if (!parentSku) return;

    // 確保 OpenCC 已初始化（如果 CDN 掉了，仍會退回到小字典）
    await loadOpenCC();

    // 1) 把父 SKU 轉為簡體，確保前綴統一
    const parentSkuSimplified = toSimplified(parentSku);
    const prefixFinal = parentSkuSimplified || parentSku;

    // 2) 把父 SKU 輸入框本身也改成簡體顯示
    const parentSkuInput = getParentSkuInput();
    if (parentSkuInput && parentSkuInput.value !== prefixFinal) {
      parentSkuInput.value = prefixFinal;
      parentSkuInput.dispatchEvent(new Event('input', { bubbles: true }));
      parentSkuInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3) 只在銷售區塊 (saleInfo) 內搜尋子 SKU 欄位
    const saleInfo = document.querySelector('div[data-anchor="saleInfo"]');
    const scope = saleInfo || document;

    const allFields = Array.from(scope.querySelectorAll('input[type="text"], textarea'));

    // 更精確地鎖定 SKU 欄位：
    //  - autoid/name/placeholder/aria-label 中包含 "sku"
    //  - 或者所屬行 / 容器的文字中包含 "SKU"
    const skuFields = allFields.filter((el) => {
      if (parentSkuInput && el === parentSkuInput) return false; // 排除父 SKU

      const val = (el.value || '').trim();
      if (!val) return false;

      const autoid = (el.getAttribute('autoid') || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

      const looksLikeSkuByAttr =
        autoid.includes('sku') ||
        name.includes('sku') ||
        placeholder.includes('sku') ||
        ariaLabel.includes('sku');

      if (looksLikeSkuByAttr) return true;

      // 往上找一圈，看父節點文本是否包含 "SKU"（避免誤傷其它欄位）
      let row = el.closest('tr, .ant-form-item, .page_edit_item, .variation_single_items');
      while (row && row !== scope && row !== document.body) {
        const txt = (row.textContent || '').replace(/\s+/g, '');
        if (txt.includes('SKU')) return true;
        row = row.parentElement;
      }

      return false;
    });

    if (!skuFields.length) {
      console.warn('[Title Helper] 未找到SKU輸入框（未匹配到包含 "SKU" 的欄位）');
      return;
    }

    const weightSuffixRe = /-?[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l|L|G|KG|ML)\s*$/i;

    skuFields.forEach((el) => {
      let val = (el.value || '').trim();
      if (!val) return;

      // 去掉末尾重量單位
      val = val.replace(weightSuffixRe, '').trim();

      // 4) 去掉舊的父 SKU 前綴（可能是繁體，也可能是以前的簡體）
      const prefixCandidates = [];
      if (parentSku) prefixCandidates.push(parentSku);
      if (parentSkuSimplified && parentSkuSimplified !== parentSku) {
        prefixCandidates.push(parentSkuSimplified);
      }

      for (const cand of prefixCandidates) {
        const candWithDash = cand + '-';
        if (val.startsWith(candWithDash)) {
          val = val.slice(candWithDash.length).trim();
          break;
        }
      }

      // 5) 重新組合：簡體父 SKU + 子 SKU
      if (val) {
        val = prefixFinal + '-' + val;
      } else {
        val = prefixFinal;
      }

      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    console.log(
      '[Title Helper] 合成SKU已完成（父SKU已轉簡體，並重新套用前綴），處理欄位數量:',
      skuFields.length
    );
  }

  // ===================== TITLE PREFIX CORE =====================

  function getStoreConfigSafe(storeNameOverride) {
    const actualShopName = getShopName();
    const effectiveStore = storeNameOverride || actualShopName;
    return STORE_CONFIG[effectiveStore] || STORE_CONFIG['墨墨優選'];
  }

  function applyPrefix(storeNameOverride) {
    const cfg = getStoreConfigSafe(storeNameOverride);
    if (!cfg || !cfg.titlePrefix) return;

    const STANDARD_PREFIX = cfg.titlePrefix;

    const titleField = getTitleField();
    if (!titleField) {
      console.warn('[Title Helper] 未找到標題輸入框，無法應用前綴');
      return;
    }

    const oldVal = titleField.value || '';
    let text = oldVal.trimStart();

    if (text.startsWith(STANDARD_PREFIX)) {
      return;
    }

    const idx = text.indexOf('台灣現貨');
    if (idx !== -1 && idx <= 4) {
      let prefixEnd = idx + '台灣現貨'.length;

      while (prefixEnd < text.length) {
        const ch = text[prefixEnd];
        if (/\s/.test(ch)) {
          prefixEnd++;
          continue;
        }
        if (!isChineseChar(ch) && !/[A-Za-z0-9]/.test(ch)) {
          prefixEnd++;
          continue;
        }
        break;
      }

      const after = text.slice(prefixEnd).trimStart();
      text = STANDARD_PREFIX + after;
    } else {
      text = STANDARD_PREFIX + text;
    }

    titleField.value = text;
    titleField.dispatchEvent(new Event('input', { bubbles: true }));
    titleField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ===================== TITLE TWEAK HELPERS =====================

  function tweakTitleByAction(action) {
    if (!action) return;

    const titleField = getTitleField();
    if (!titleField) {
      console.warn('[Title Helper] 未找到標題輸入框，無法進行標題微調');
      return;
    }

    const raw = (titleField.value || '').trim();
    if (!raw) return;

    let usedPrefix = '';
    for (const cfg of Object.values(STORE_CONFIG)) {
      const p = cfg.titlePrefix;
      if (p && raw.startsWith(p)) {
        usedPrefix = p;
        break;
      }
    }

    const body = usedPrefix ? raw.slice(usedPrefix.length).trim() : raw;
    if (!body) return;

    const tokens = body.split(' ').filter(Boolean);
    if (!tokens.length) return;

    if (action === '尾词调换') {
      if (tokens.length >= 2) {
        const last = tokens.length - 1;
        const tmp = tokens[last];
        tokens[last] = tokens[last - 1];
        tokens[last - 1] = tmp;
      }
    } else if (
      action === '學生黨平價' ||
      action === '美妝化妝品' ||
      action === '新品上市'
    ) {
      if (!tokens.includes(action)) {
        tokens.push(action);
      }
    } else {
      return;
    }

    const newBody = tokens.join(' ');
    const newTitle = usedPrefix ? usedPrefix + newBody : newBody;

    titleField.value = newTitle;
    titleField.dispatchEvent(new Event('input', { bubbles: true }));
    titleField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ===================== FLOATING UI =====================

  function createFloatingPanel() {
    if (document.getElementById('bs-title-prefix-helper')) return;

    const panel = document.createElement('div');
    panel.id = 'bs-title-prefix-helper';
    Object.assign(panel.style, {
      position: 'fixed',
      right: '16px',
      bottom: '80px',
      zIndex: 99999,
      background: 'rgba(255,255,255,0.97)',
      border: '1px solid #ddd',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '8px 10px',
      fontSize: '12px',
      fontFamily: 'sans-serif',
    });

    const title = document.createElement('div');
    title.textContent = '标题前缀助手';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '4px';
    panel.appendChild(title);

    const currentShopLabel = document.createElement('div');
    currentShopLabel.style.marginBottom = '4px';
    currentShopLabel.textContent = '店铺：读取中...';
    panel.appendChild(currentShopLabel);

    const select = document.createElement('select');
    select.style.maxWidth = '160px';
    select.style.marginBottom = '4px';

    for (const name of Object.keys(STORE_CONFIG)) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    panel.appendChild(select);

    const btnApply = document.createElement('button');
    btnApply.textContent = '应用前缀+描述+MD5';
    Object.assign(btnApply.style, {
      display: 'block',
      width: '100%',
      marginTop: '4px',
      padding: '4px 0',
      cursor: 'pointer',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: '#ffecf5',
    });

    btnApply.addEventListener('click', () => {
      const chosenStore = select.value || getShopName();
      applyPrefix(chosenStore);
      applyDescriptionForStore(chosenStore);
      const md5btn = document.querySelector('.sell_md5');
      if (md5btn) md5btn.click();
      refreshShopLabel();
    });

    panel.appendChild(btnApply);

    const tweakSelect = document.createElement('select');
    tweakSelect.style.display = 'block';
    tweakSelect.style.width = '100%';
    tweakSelect.style.marginTop = '4px';
    ['', '尾词调换', '學生黨平價', '美妝化妝品', '新品上市'].forEach(function (label) {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label || '標題微調選項';
      tweakSelect.appendChild(opt);
    });
    tweakSelect.addEventListener('change', function () {
      const action = tweakSelect.value;
      tweakTitleByAction(action);
    });
    panel.appendChild(tweakSelect);

    const btnSku = document.createElement('button');
    btnSku.textContent = '合成SKU';
    Object.assign(btnSku.style, {
      display: 'block',
      width: '100%',
      marginTop: '4px',
      padding: '4px 0',
      cursor: 'pointer',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: '#ffecec',
    });

    btnSku.addEventListener('click', async () => {
      const parentSkuInput = getParentSkuInput();
      const parentSku = parentSkuInput ? (parentSkuInput.value || '').trim() : '';

      if (!parentSku) {
        console.warn('[Title Helper] 未找到父SKU輸入框或父SKU為空');
        refreshShopLabel();
        return;
      }

      await updateSkuWithParent(parentSku);
      refreshShopLabel();
    });


    panel.appendChild(btnSku);

    const btnColor = document.createElement('button');
    btnColor.textContent = 'SKU转繁体';
    Object.assign(btnColor.style, {
      display: 'block',
      width: '100%',
      marginTop: '4px',
      padding: '4px 0',
      cursor: 'pointer',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: '#e6f7ff',
    });

    btnColor.addEventListener('click', () => {
      convertColorOptionsToTraditional();
    });

    panel.appendChild(btnColor);

    function refreshShopLabel() {
      const autoShop = getShopName();
      if (autoShop) {
        currentShopLabel.textContent = '店铺：' + autoShop;
        if (STORE_CONFIG[autoShop]) select.value = autoShop;
      } else {
        currentShopLabel.textContent = '店铺：未检测到';
      }
    }

    refreshShopLabel();
    let refreshCount = 0;
    const refreshTimer = setInterval(() => {
      refreshCount++;
      refreshShopLabel();
      if (refreshCount > 15) clearInterval(refreshTimer);
    }, 1000);

    document.body.appendChild(panel);
  }

  // ===================== INIT =====================

  function init() {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      // 優先等到標題欄位出現；如果一直抓不到，也不要影響浮動面板顯示
      if (getTitleField() || tries > 6) {
        createFloatingPanel();
        clearInterval(timer);
        return;
      }
      if (tries > 40) {
        // 超時保險：直接停止輪詢，避免無限循環
        clearInterval(timer);
      }
    }, 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
