// ==UserScript==
// @name         BigSeller 产品名称简体→繁体 & 清空短描述 & 裁剪长描述图片 (Alt+T / 按钮 / 菜单)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 BigSeller 抓取页面中，一键完成：产品名称简体→繁体（英文不变）、清空“短描述”，并在“长描述”中只保留前12张图片。
// @match        https://www.bigseller.pro/web/crawl/index.htm*
// @require      https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // OpenCC 简体→繁体（台湾）
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

    function cn2tw(text) {
        if (!text) return text;
        return converter(text);
    }

    // ====== 产品标题中文分块 ======

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

    // 根据 BigSeller 的结构，通过 "page_edit_item" + 内部的 .title 文本来定位整个字段块
    function findItemByTitle(labelText) {
        const items = document.querySelectorAll('div.page_edit_item');
        for (const item of items) {
            const titleDiv = item.querySelector('div.title');
            if (!titleDiv) continue;
            const t = (titleDiv.textContent || '').trim();
            if (t.includes(labelText)) {
                return item;
            }
        }
        return null;
    }

    // 在字段块内部查找真正的输入控件（input / textarea / contenteditable）
    function findFieldInItem(item) {
        if (!item) return null;
        const content = item.querySelector('div.content') || item;

        // 优先 textarea（短描述就是 textarea.product_desc）
        let field = content.querySelector('textarea');
        if (field) return field;

        // 其次 input
        field = content.querySelector('input[type="text"], input');
        if (field) return field;

        // 再找富文本 contenteditable
        field = content.querySelector('[contenteditable="true"]');
        if (field) return field;

        return null;
    }

    // 读取字段值（兼容 input / textarea / contenteditable）
    function getFieldValue(field) {
        if (!field) return '';
        if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
            return field.value || '';
        } else if (field.isContentEditable) {
            return field.innerText || '';
        }
        return '';
    }

    // 设置字段值并触发 input/change
    function setFieldValue(field, value) {
        if (!field) return;

        if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
            field.value = value;
        } else if (field.isContentEditable) {
            field.innerText = value;
        }

        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 在给定的根节点内，只保留前 keepCount 张 <img>
    function keepFirstNImages(root, keepCount) {
        if (!root || !root.querySelectorAll) return;
        const imgs = Array.from(root.querySelectorAll('img'));
        if (imgs.length <= keepCount) return;
        for (let i = keepCount; i < imgs.length; i++) {
            imgs[i].remove();
        }
    }

    // 主逻辑：标题→繁体+分块 + 清短描 + 长描限12图
    function processAll() {
        // 1. 产品名称：简体→繁体→分块
        const titleItem = findItemByTitle('产品名称');
        const titleField = findFieldInItem(titleItem);
        if (titleField) {
            const original = getFieldValue(titleField).trim();
            if (original) {
                const converted = cn2tw(original);
                const spaced = smartSpaceChinese(converted);
                setFieldValue(titleField, spaced);
                console.log('[BigSeller CN→TW] 产品名称 已转换并分块');
            } else {
                console.log('[BigSeller CN→TW] 产品名称 为空，跳过');
            }
        } else {
            console.log('[BigSeller CN→TW] 未找到 产品名称 字段');
        }

        // 2. 短描述：清空
        const shortItem = findItemByTitle('短描述');
        const shortField = findFieldInItem(shortItem);
        if (shortField) {
            setFieldValue(shortField, '');
            console.log('[BigSeller CN→TW] 短描述 已清空');
        } else {
            console.log('[BigSeller CN→TW] 未找到 短描述 字段');
        }

        // 3. 长描述：保留前12张图片，删除其余
        const longItem = findItemByTitle('长描述');
        if (longItem) {
            const content = longItem.querySelector('div.content') || longItem;

            // 情况1：富文本是 contenteditable 容器
            const editable = content.querySelector('[contenteditable="true"]');
            if (editable) {
                keepFirstNImages(editable, 12);
                editable.dispatchEvent(new Event('input', { bubbles: true }));
                editable.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[BigSeller CN→TW] 长描述 图片已裁剪为前12张 (contenteditable)');
                return;
            }

            // 情况2：富文本在 iframe 里
            const iframe = content.querySelector('iframe');
            if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
                keepFirstNImages(iframe.contentDocument.body, 12);
                iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
                iframe.contentDocument.body.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[BigSeller CN→TW] 长描述 图片已裁剪为前12张 (iframe)');
                return;
            }

            console.log('[BigSeller CN→TW] 长描述 找到了，但未识别出富文本容器');
        } else {
            console.log('[BigSeller CN→TW] 未找到 长描述 字段');
        }
    }

    // 添加一个悬浮按钮，方便点击执行
    function addFloatingButton() {
        if (document.getElementById('bs-cn2tw-oneclick-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'bs-cn2tw-oneclick-btn';
        btn.textContent = '标题繁体 + 清短描 + 长描限12图';
        Object.assign(btn.style, {
            position: 'fixed',
            right: '16px',
            top: '120px',
            zIndex: 99999,
            padding: '6px 10px',
            background: '#ffecf5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
        });
        btn.addEventListener('click', processAll);
        document.body.appendChild(btn);

        // 键盘 Alt+T 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                processAll();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addFloatingButton);
    } else {
        addFloatingButton();
    }

    // Tampermonkey 菜单：一键处理
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('BigSeller 一键：标题繁体 + 清空短描述 + 长描述限12图', processAll);
    }

    console.log('[BigSeller CN→TW One-Click v1.0] Alt+T / 按钮 / 菜单 已加载');
})();
