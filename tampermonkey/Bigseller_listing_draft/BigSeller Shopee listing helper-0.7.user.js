// ==UserScript==
// @name         BigSeller Shopee Title Prefix Helper
// @namespace    https://joe.bigseller.helper
// @version      0.8
// @description  Add store-based prefixes to Shopee product titles on BigSeller edit pages, with smart Chinese spacing, description template, MD5 click, SKU normalize, and title tweak tools.
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

  // 简体转繁体（简易版降级）
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

  let openccReady = false;
  let openccConverter = null;

  function loadOpenCC() {
    if (openccConverter && typeof openccConverter === 'function') {
      return Promise.resolve();
    }
    if (openccReady) {
      return Promise.resolve();
    }
    openccReady = true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js';
      script.onload = () => {
        try {
          if (window.OpenCC) {
            openccConverter = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
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

  function toTraditional(text) {
    const s = text || '';
    if (openccConverter && typeof openccConverter === 'function') {
      try {
        return openccConverter(s);
      } catch (e) {
        console.warn('[Title Helper] OpenCC 转换出错，使用简易映射:', e);
      }
    }
    return s.split('').map((ch) => SIMPLE_TO_TRAD[ch] || ch).join('');
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function textNormalize(str) {
    return (str || '').replace(/\s+/g, '').trim();
  }

  function findFieldByLabelText(labelText, preferSelectors) {
    const target = textNormalize(labelText);
    const labels = Array.from(
      document.querySelectorAll('label, .el-form-item__label, .ivu-form-item-label, .ant-form-item-label')
    );

    // 1) 根据 label 文本模糊匹配
    for (const label of labels) {
      const txt = textNormalize(label.textContent || '');
      if (!txt.includes(target)) continue; // 支持 “产品名称 *” 之类

      const item =
        label.closest('.el-form-item, .ivu-form-item, .ant-form-item, .form-group') || label.parentElement;
      if (!item) continue;

      const selectors =
        preferSelectors && preferSelectors.length ? preferSelectors.join(',') : 'input, select, textarea';

      const field = item.querySelector(selectors);
      if (field) return field;
    }

    // 2) 兜底：遍历所有输入框，向上找包含目标文字的父节点
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
    // 1) 新版 antd Select：div[autoid="store_button"]
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

    // 2) 通过表单项 label = 店铺
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

    // 3) 旧版：label + select/input
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
    return findFieldByLabelText(LABEL_TITLE, ['input', 'textarea']);
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

    // 把前面的英文品牌单独拿出来
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
    let currentType = null; // 'C' or 'O'

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
    // 0) CKEditor iframe
    const ckIframe = document.querySelector('iframe.cke_wysiwyg_frame');
    if (ckIframe && ckIframe.contentDocument && ckIframe.contentDocument.body) {
      return ckIframe.contentDocument.body;
    }

    // 1) textarea via label
    const viaLabel = findFieldByLabelText('产品描述', ['textarea']);
    if (viaLabel) return viaLabel;

    // 2) via AI button
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

    // 3) via left title
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

    // TEXTAREA / INPUT 模式
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

    // 富文本模式
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

  // ===================== COLOR VARIANT HELPER =====================

  async function convertColorOptionsToTraditional() {
    await loadOpenCC();

    const allEditLinks = Array.from(document.querySelectorAll('a.custom_item_edit'));
    if (!allEditLinks.length) {
      console.warn('[Title Helper] 未找到颜色编辑按钮');
      return;
    }

    const editLinks = allEditLinks.filter((link) => {
      const container =
        link.closest('.variation_second_name_text_0') ||
        link.parentElement ||
        link.closest('span, div, td');
      const txt = (container && container.textContent) ? container.textContent.trim() : '';
      return txt.includes('#');
    });

    if (!editLinks.length) return;

    for (const link of editLinks) {
      link.click();
      await sleep(150);

      const popup = document.querySelector(
        'div.bs_antd_textarea_box.textareaBox[style*="position: absolute"]'
      );
      if (!popup) continue;

      const textarea =
        popup.querySelector('textarea.ant-input.bs_antd_textarea') ||
        popup.querySelector('textarea');
      if (!textarea) continue;

      const orig = (textarea.value || '').trim();
      if (!orig.includes('#')) {
        const okBtnSkip = popup.querySelector('button.ant-btn.ant-btn-primary');
        if (okBtnSkip) okBtnSkip.click();
        await sleep(120);
        continue;
      }

      let simplified = orig;
      const hashIndex = simplified.indexOf('#');
      if (hashIndex !== -1) {
        const beforeHash = simplified.slice(0, hashIndex);
        const afterHash = simplified.slice(hashIndex + 1);
        let code = beforeHash;
        const dashIdx = code.indexOf('-');
        if (dashIdx !== -1) {
          code = code.slice(dashIdx + 1);
        }
        simplified = code + '#' + afterHash;
      }

      const converted = toTraditional(simplified);

      if (converted && converted !== orig) {
        textarea.value = converted;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const okBtn = popup.querySelector('button.ant-btn.ant-btn-primary');
      if (okBtn) okBtn.click();

      await sleep(150);
    }
  }

  // ===================== SKU NORMALIZATION =====================

  function updateSkuWithParent(parentSku) {
    if (!parentSku) return;

    const allFields = Array.from(document.querySelectorAll('input, textarea'));

    const skuFields = allFields.filter((el) => {
      const v = (el.value || '').trim();
      return v && v.includes('#');
    });

    if (!skuFields.length) return;

    const weightSuffixRe = /-?[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l|L|G|KG|ML)\s*$/i;

    skuFields.forEach((el) => {
      let val = (el.value || '').trim();
      if (!val) return;

      val = val.replace(weightSuffixRe, '').trim();

      if (!val.startsWith(parentSku)) {
        val = parentSku + '-' + val;
      }

      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // ===================== TITLE PREFIX CORE =====================

  function applyPrefix(storeNameOverride) {
    const cfg = getStoreConfig(storeNameOverride);
    if (!cfg || !cfg.titlePrefix) return;

    const STANDARD_PREFIX = cfg.titlePrefix;

    const titleField = getTitleField();
    if (!titleField) return;

    const oldVal = titleField.value || '';
    let text = oldVal.trimStart();

    // 已经是该店铺的标准前缀：不处理
    if (text.startsWith(STANDARD_PREFIX)) {
      return;
    }

    // 处理各种旧形式的「台灣現貨」前缀
    const idx = text.indexOf('台灣現貨');
    if (idx !== -1 && idx <= 4) {
      // 从「台灣現貨」末尾开始
      let prefixEnd = idx + '台灣現貨'.length;

      // 吃掉紧跟其后的空格 + 非中文非字母非数字（通常是 emoji 或符号）
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
      // 没有任何「台灣現貨」 → 直接加标准前缀
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
    if (!titleField) return;

    const raw = (titleField.value || '').trim();
    if (!raw) return;

    // 检测当前使用的前缀（4 家店里任意一个）
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

    // 中间：标题微调 下拉（选择即生效）
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

    // 第二个按钮：仅负责 SKU 规范化
    const btnMd5 = document.createElement('button');
    btnMd5.textContent = '合成SKU';
    Object.assign(btnMd5.style, {
      display: 'block',
      width: '100%',
      marginTop: '4px',
      padding: '4px 0',
      cursor: 'pointer',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: '#ffecec',
    });

    btnMd5.addEventListener('click', () => {
      const parentSkuInput = document.querySelector('input[autoid="parent_sku_text"]');
      const parentSku = parentSkuInput ? (parentSkuInput.value || '').trim() : '';

      if (!parentSku) {
        refreshShopLabel();
        return;
      }

      updateSkuWithParent(parentSku);

      refreshShopLabel();
    });

    panel.appendChild(btnMd5);

    // 第三个按钮：SKU转繁体
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
      if (getTitleField()) {
        createFloatingPanel();
        clearInterval(timer);
      }
      if (tries > 20) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
