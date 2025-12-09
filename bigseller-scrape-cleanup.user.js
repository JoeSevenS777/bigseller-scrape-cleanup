// ==UserScript==
// @name         BigSeller 产品名称简体→繁体 & 清空短描述 & 裁剪长描述图片 (Alt+T / 按钮 / 菜单)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  在 BigSeller 抓取页面中，一键完成：产品名称简体→繁体（英文品牌大写且无空格，紧贴中文）、清空“短描述”，并在“长描述”中只保留前12张图片。
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

    // ====== 产品标题中文分块（改进版）======

    function isChineseChar(ch) {
        return /[\u4E00-\u9FFF]/.test(ch);
    }

    /**
     * 按规则拆分纯中文片段：
     * - 只接受所有段长都在 [4, 8] 的拆分方案；
     * - 优先使用更长的段（8 → 7 → 6 → 5 → 4），避免乱切短词；
     * - 如果拆不干净，就完全不拆，返回原片段；
     * - 针对常见彩妆后缀（唇彩、唇釉、彩妝等），尽量并入前一个段，但并入后也必须 ≤ 8。
     */
    function chunkChineseSegment(seg) {
        const chars = Array.from(seg);
        const n = chars.length;

        // 词典：可根据需要不断扩充，所有在这里的词在分块时会被视为一个整体，不会被拆开
        const WORD_DICT = [
            // 核心产品类别
            '眼線液筆', '眼線筆',
            '高光粉', '高光盤',
            '修容盤', '修容粉',
            '腮紅', '腮紅盤',
            '口紅', '唇彩', '唇釉', '唇膏', '唇蜜',
            '粉底液', '粉底膏', '粉餅', '氣墊',
            '遮瑕', '遮瑕膏',
            '睫毛膏', '眉筆',
            '眼影盤', '眼影筆',
            '定妝噴霧', '定妝粉',
            '玻璃唇',
            '化妝品', '彩妝', '美妝', '美妝蛋',
            '粉撲', '化妝刷', '美妝工具',

            // 常见修饰/营销词（可持续补充）
            '水光', '潤透', '顯白', '秋冬', '韓系', '裸妝', '氛圍感', '元氣', '清透', '低飽和', '素顏',
            '嘟嘟唇', '元氣感', '日常妝', '偽素顏',
            '小熊', '奶萌', '獨角獸'
        ];

        const WORD_SET = new Set(WORD_DICT);
        const MAX_WORD_LEN = WORD_DICT.reduce((m, w) => Math.max(m, w.length), 1);

        // 整体长度 ≤ 8：直接不拆
        if (n <= 8) {
            return [seg];
        }

        // 把纯中文串先按词典切成 token（最长优先），剩余的按单字处理
        function tokenizeChinese() {
            const tokens = [];
            let i = 0;
            while (i < n) {
                let matched = null;
                const maxLen = Math.min(MAX_WORD_LEN, n - i);
                for (let len = maxLen; len >= 2; len--) {
                    const slice = chars.slice(i, i + len).join('');
                    if (WORD_SET.has(slice)) {
                        matched = slice;
                        break;
                    }
                }
                if (matched) {
                    tokens.push(matched);
                    i += matched.length;
                } else {
                    // 不在词典里的字，作为单字 token
                    tokens.push(chars[i]);
                    i += 1;
                }
            }
            return tokens;
        }

        const tokens = tokenizeChinese();
        const tokenLens = tokens.map(t => Array.from(t).length);
        const totalLen = tokenLens.reduce((a, b) => a + b, 0);

        // 再次保护：总长≤8就不拆
        if (totalLen <= 8) {
            return [seg];
        }

        // 尝试在 token 级别上分块：
        // 1) 第一轮要求所有块长度在 [4,8]
        // 2) 如果失败，第二轮允许“最后一块”长度在 [1,8]，其它块仍然 [4,8]
        function tryPartition(allowLastShort) {
            const memo = new Map();

            function dfs(index) {
                if (index === tokens.length) return [];
                const key = index + '|' + (allowLastShort ? '1' : '0');
                if (memo.has(key)) return memo.get(key);

                let best = null;
                // 从当前 token 开始，累积组成一块
                for (let end = index; end < tokens.length; end++) {
                    const len = tokenLens.slice(index, end + 1).reduce((a, b) => a + b, 0);
                    if (len > 8) break; // 超过 8 必须停

                    const isLastGroup = (end === tokens.length - 1);

                    if (!isLastGroup) {
                        // 非最后一块：长度必须在 [4,8]
                        if (len < 4) continue;
                    } else {
                        // 最后一块：
                        // - allowLastShort = false 时，也要求 [4,8]
                        // - allowLastShort = true 时，允许 [1,8]
                        if (!allowLastShort && len < 4) continue;
                        if (len < 1) continue; // 理论上不会发生
                    }

                    const rest = dfs(end + 1);
                    if (rest !== null) {
                        const group = tokens.slice(index, end + 1).join('');
                        best = [group, ...rest];
                        break; // 先找到的就是最“靠前”的分法
                    }
                }

                if (best === null) {
                    memo.set(key, null);
                    return null;
                }
                memo.set(key, best);
                return best;
            }

            return dfs(0);
        }

        let segments = tryPartition(false);
        if (!segments) {
            segments = tryPartition(true);
        }

        // 如果连放宽最后一块都分不出来一个合法方案，就不拆
        if (!segments) {
            return [seg];
        }

        return segments;
    }

    /**
     * 标题智能分块：
     * - 把最前面的英文品牌提取出来：只要是以字母开头的连续 A-Z0-9/&/-/空格；
     * - 品牌：转为全大写，并去掉内部所有空格；
     * - 剩余部分按“中文 vs 其它”分组：
     *   - 中文组交给 chunkChineseSegment 拆分；
     *   - 非中文组只做 trim；
     * - 中文/非中文段之间用一个空格拼接；
     * - 最终品牌与第一个中文段之间【不加空格】。
     */
    function smartSpaceChinese(title) {
        if (!title) return '';
        const trimmed = title.trim();

        // 提取前面的英文品牌（字母 / 数字 / 空格 / & / -）
        let brand = '';
        let rest = trimmed;
        const brandMatch = trimmed.match(/^[A-Za-z][A-Za-z0-9\s&-]*/);

        if (brandMatch) {
            // 品牌：全部大写 + 去掉内部空格
            brand = brandMatch[0].replace(/\s+/g, '').toUpperCase();
            rest = trimmed.slice(brandMatch[0].length);
        }

        // 关键改动：去掉剩余部分里的所有空格，避免在中文中间硬切
        rest = rest.replace(/\s+/g, '');

        const tokens = [];
        let buffer = '';
        let currentType = null; // 'C'（中文）或 'O'（其它）

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
            const type = isChineseChar(ch) ? 'C' : 'O';
            if (currentType && type !== currentType) {
                flush();
            }
            currentType = type;
            buffer += ch;
        }
        flush();

        // 中文 / 其它段之间用空格
        const chinesePart = tokens.filter(Boolean).join(' ');

        // 最终组合：
        // - 品牌：全大写+无内部空格
        // - 品牌和第一个中文段之间【不加空格】
        if (brand) {
            if (chinesePart) {
                return brand + chinesePart; // 例如：DHDH速描優美眼線液筆
            }
            return brand;
        }
        return chinesePart;
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

        // 优先 textarea
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

    console.log('[BigSeller CN→TW One-Click v1.2] Alt+T / 按钮 / 菜单 已加载');
})();
