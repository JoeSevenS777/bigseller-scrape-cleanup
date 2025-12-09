// ==UserScript==
// @name         BigSeller Shopee Title Prefix Helper
// @namespace    https://joe.bigseller.helper
// @version      0.7
// @description  Add store-based prefixes to Shopee product titles on BigSeller edit pages, with smart Chinese spacing, description template, and MD5 button click.
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
    // 简体转繁体（简易版，可按需要继续补充映射）
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
    // 1) 优先：兼容 BigSeller 新版 antd Select（div[autoid="store_button"]）
    let rendered = null;

    // 1.1 直接按 autoid 找容器
    const antContainers = Array.from(document.querySelectorAll('div[autoid="store_button"]'));
    for (const c of antContainers) {
      // 实际选中的值在 .ant-select-selection-selected-value 里
      let r = c.querySelector('.ant-select-selection-selected-value');
      if (!r) {
        // 兜底：有些版本只有 __rendered
        r = c.querySelector('.ant-select-selection__rendered');
      }
      if (r && textNormalize(r.textContent || '')) {
        rendered = r;
        break;
      }
    }

    // 1.2 按表单项 label = 店铺 来找
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

    // 2) 旧版：通过 label + select/input 获取
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
        size = remaining; // 最后不足 6 个就全部一块
      } else {
        // 默认 4 个一组，避免最后只剩 1 个字符
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

      // 如果下一个 2 字刚好是产品名后缀，就把它们一起并入当前块
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

    // 把前面的英文品牌单独拿出来（例如 CAPPUVINI）
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
    let currentType = null; // 'C' (Chinese) or 'O' (Other)

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
    // 0) 直接处理 CKEditor iframe（BigSeller 当前用于产品描述）
    const ckIframe = document.querySelector('iframe.cke_wysiwyg_frame');
    if (ckIframe && ckIframe.contentDocument && ckIframe.contentDocument.body) {
      return ckIframe.contentDocument.body; // 在 iframe 里的 <body> 上操作 HTML
    }

    // 1) 普通 textarea，通过标签查找
    const viaLabel = findFieldByLabelText('产品描述', ['textarea']);
    if (viaLabel) return viaLabel;

    // 2) 通过 AI 按钮附近来定位
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

    // 3) 通过左侧标题“产品描述/產品描述”来定位
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

    // TEXTAREA / INPUT 模式：去掉旧前后缀文本，保留中间内容，再加上当前前后缀
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      let text = field.value || '';

      // 多次清理旧的前缀 / 后缀，防止堆叠（所有店铺模板都清一次）
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

    // 富文本 / contenteditable / iframe body 模式：
    // 结构通常是：前缀文字 + 图片(及中间说明) + 后缀文字
    // 目标：删掉前后缀文字，保留中间图片（及其周围结构），再包上当前前后缀
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
      // 没有图片时，保留原来的全部内容作为“中间内容”
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

  // ===================== CORE =====================

  async function convertColorOptionsToTraditional() {
    await loadOpenCC();
    // 找到所有颜色/规格的小铅笔按钮
    const allEditLinks = Array.from(document.querySelectorAll('a.custom_item_edit'));
    if (!allEditLinks.length) {
      console.warn('[Title Helper] 未找到颜色编辑按钮');
      return;
    }

    // 仅保留前面文字里本身含有 # 的项，例如 "CP365-01#蔷薇烟"；
    // 像 "3g" 这种净含量不会被点击
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
      // 点击铅笔，弹出编辑框
      link.click();
      await sleep(150);

      // 只处理当前弹出的 textarea（position: absolute 的浮层）
      const popup = document.querySelector(
        'div.bs_antd_textarea_box.textareaBox[style*="position: absolute"]'
      );
      if (!popup) continue;

      const textarea =
        popup.querySelector('textarea.ant-input.bs_antd_textarea') ||
        popup.querySelector('textarea');
      if (!textarea) continue;

      const orig = (textarea.value || '').trim();

      // 再保险：没有 # 的直接跳过（不应该出现在这里）
      if (!orig.includes('#')) {
        const okBtnSkip = popup.querySelector('button.ant-btn.ant-btn-primary');
        if (okBtnSkip) okBtnSkip.click();
        await sleep(120);
        continue;
      }

      // 1) 去掉代码前面的前缀，如 "CP365-01#蔷薇烟" → "01#蔷薇烟"
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

      // 2) 文本转繁体
      const converted = toTraditional(simplified);

      if (converted && converted !== orig) {
        textarea.value = converted;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 点击本弹窗里的「确定」按钮
      const okBtn = popup.querySelector('button.ant-btn.ant-btn-primary');
      if (okBtn) okBtn.click();

      await sleep(150);
    }
  }

  // ===================== CORE =====================

    function updateSkuWithParent(parentSku) {
        if (!parentSku) return;

        // 抓取页面上所有输入框和文本框
        const allFields = Array.from(document.querySelectorAll('input, textarea'));

        // 把 value 里带 # 的当作 SKU，例如 CP365-01#蔷薇烟-3g
        const skuFields = allFields.filter((el) => {
            const v = (el.value || '').trim();
            return v && v.includes('#');
        });

        if (!skuFields.length) return;

        // 尾部重量/容量后缀，例如 -3g / -10ml / 5ml 等
        const weightSuffixRe = /-?[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l|L|G|KG|ML)\s*$/i;

        skuFields.forEach((el) => {
            let val = (el.value || '').trim();
            if (!val) return;

            // 去掉末尾的重量/容量
            val = val.replace(weightSuffixRe, '').trim();

            // 如果已经以父 SKU 开头，就不重复添加
            if (!val.startsWith(parentSku)) {
                val = parentSku + '-' + val;
            }

            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }


  // ===================== CORE =====================

  // ===================== CORE =====================

  function applyPrefix(storeNameOverride) {
    const cfg = getStoreConfig(storeNameOverride);
    if (!cfg || !cfg.titlePrefix) return;

    const STANDARD_PREFIX = cfg.titlePrefix; // 每个店铺各自的标准前缀

    const titleField = getTitleField();
    if (!titleField) return;

    const oldVal = titleField.value || '';
    let text = oldVal.trimStart();

    // 1）已经是该店铺的标准前缀：什么也不做
    if (text.startsWith(STANDARD_PREFIX)) {
      return;
    }

    // 2）前面有其他形式的「台灣現貨」前缀，例如 💕台灣現貨💕 / 💋 台灣現貨💋 / 🎀台灣現貨🎀
    //    规则：如果「台灣現貨」出现在前 4 个字符之内，则视为旧前缀，统一替换为本店標準前缀


    // 2）前面有其他形式的「台灣現貨」前缀，例如 💕台灣現貨💕 / 💋 台灣現貨💋
    //    规则：如果「台灣現貨」出现在前 4 个字符之内，则视为旧前缀，统一替换
    const idx = text.indexOf('台灣現貨');
    if (idx !== -1 && idx <= 4) {
      const after = text.slice(idx + '台灣現貨'.length).trimStart();
      text = STANDARD_PREFIX + after;
    } else {
      // 3）没有任何「台灣現貨」前缀 → 直接加上标准前缀
      text = STANDARD_PREFIX + text;
    }

    titleField.value = text;
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
      // 应用前缀 + 描述后，自动点击 MD5 按钮
      const md5btn = document.querySelector('.sell_md5');
      if (md5btn) md5btn.click();
      refreshShopLabel();
    });

    panel.appendChild(btnApply);

    // 第二个按钮：仅负责 MD5（以及后续可扩展为 SKU 处理）
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
      // 1) 先处理 Parent SKU + 子 SKU
      const parentSkuInput = document.querySelector('input[autoid="parent_sku_text"]');
      const parentSku = parentSkuInput ? (parentSkuInput.value || '').trim() : '';

      // 如果 Parent SKU 为空，则直接停止，不处理 SKU
      if (!parentSku) {
        refreshShopLabel();
        return;
      }

      // 使用父 SKU 更新所有变体 SKU（不再在此处点击 MD5）
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
    } else {     currentShopLabel.textContent = '店铺：未检测到';
      }
    }

    // 初始刷新一次，并定时刷新几次，兼容页面加载后用户再选择店铺的情况
    refreshShopLabel();
    let refreshCount = 0;
    const refreshTimer = setInterval(() => {
      refreshCount++;
      refreshShopLabel();
      if (refreshCount > 15) clearInterval(refreshTimer);
    }, 1000);

    const autoShop = getShopName();
    if (autoShop) {
      currentShopLabel.textContent = '店铺：' + autoShop;
      if (STORE_CONFIG[autoShop]) select.value = autoShop;
    } else {
      currentShopLabel.textContent = '店铺：未检测到';
    }

    document.body.appendChild(panel);
  }

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
  } else init();
})();
