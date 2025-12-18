/**
 * content.js (v1.0)
 *
 * Goal: classify and return 3 groups of image URLs from a 1688 offer page:
 *  - main: gallery / main image set
 *  - sku: sku/spec thumbnails
 *  - details: description / 图文详情 images
 *
 * Key change vs v0.9: do NOT rely on network hooking (often misses due to timing/CSP).
 * Instead, discover the product-description "detailUrl" from the page's embedded JSON
 * (window.context / __INIT_DATA__-like blobs) and fetch+parse that HTML for <img> URLs.
 */

function uniq(arr){
  const s=new Set();
  const out=[];
  for (const x of arr){
    if (!x) continue;
    const k=String(x);
    if (s.has(k)) continue;
    s.add(k);
    out.push(k);
  }
  return out;
}

function normalizeUrl(u){
  if (!u) return null;
  u = String(u).trim();
  if (!u) return null;
  if (u.startsWith('//')) u = location.protocol + u;
  // strip common thumbnail transforms
  u = u.replace(/(\.(?:jpe?g|png|webp|gif))_.+$/i, '$1');
  u = u.replace(/_(\d+x\d+)(q\d+)?\.(jpe?g|png|webp|gif)(\?|#|$)/i, '.$3$4');
  return u;
}

function extractImgUrlsFromText(text){
  const out=[];
  if (!text) return out;

  // absolute
  const reAbs = /https?:\/\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/ig;
  let m;
  while((m=reAbs.exec(text))!==null){
    out.push(normalizeUrl(m[0]));
  }

  // protocol-relative
  const rePR = /\/\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/ig;
  while((m=rePR.exec(text))!==null){
    out.push(normalizeUrl(m[0]));
  }

  return out.filter(Boolean);
}

function cleanProductTitle(s){
  if (!s) return '';
  s = String(s).replace(/\s+/g,' ').trim();
  s = s.replace(/\s*-\s*阿里巴巴\s*$/,'').trim();
  s = s.replace(/\s*-\s*1688\.com\s*$/i,'').trim();
  return s;
}
function isLikelySupplierName(s){
  if (!s) return false;
  const t = String(s);
  const kw = /(选品中心|供应商|厂家|工厂|公司|商行|店|旗舰店|专营店|官方|国际|中心|集团|企业|批发|市场|仓|仓库|店铺)/;
  return kw.test(t) || t.length < 8;
}
function extractOfferTitleFromScripts(){
  const scripts = Array.from(document.scripts || []);
  const text = scripts.map(s => s.textContent || '').join('\n');
  const patterns = [
    /"offerTitle"\s*:\s*"([^"]{4,200})"/,
    /"subject"\s*:\s*"([^"]{4,200})"/
  ];
  for (const p of patterns){
    const m = text.match(p);
    if (m && m[1]) return cleanProductTitle(m[1]);
  }
  return '';
}
function getProductName(){
  const candidates = [];
  const embedded = extractOfferTitleFromScripts();
  if (embedded) candidates.push(embedded);

  const og = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (og) candidates.push(cleanProductTitle(og));

  const h1 = document.querySelector('h1')?.innerText;
  if (h1) candidates.push(cleanProductTitle(h1));

  const titleEl = document.querySelector('[class*="title"] h1,[class*="od-title"],[data-role*="title"],[data-title]');
  if (titleEl?.innerText) candidates.push(cleanProductTitle(titleEl.innerText));

  const docTitle = cleanProductTitle(document.title);
  if (docTitle) candidates.push(docTitle);

  for (const c of candidates){
    const t = (c||'').trim();
    if (!t) continue;
    if (t.length >= 10 && !isLikelySupplierName(t)) return t;
  }
  const best = candidates.filter(Boolean).sort((a,b)=>b.length-a.length)[0] || '1688_product';
  return best || '1688_product';
}

function collectDomImgs(scope){
  const root = scope || document;
  const urls=[];
  root.querySelectorAll('img').forEach(img=>{
    const attrs = ['src','data-src','data-original','data-lazy-src','data-ks-lazyload','data-img','data-url'];
    for (const a of attrs){
      const v = img.getAttribute(a);
      if (v) urls.push(normalizeUrl(v));
    }
    if (img.currentSrc) urls.push(normalizeUrl(img.currentSrc));
  });
  return urls.filter(Boolean);
}

function collectEmbeddedScriptText(){
  const chunks=[];
  document.querySelectorAll('script').forEach(sc=>{
    const t = sc.textContent || '';
    if (t && t.length > 50) chunks.push(t);
  });
  return chunks.join('\n');
}

function findDetailUrlFromScripts(){
  const blob = collectEmbeddedScriptText();
  // detailUrl is usually inside a JSON field like: "detailUrl":"https:\/\/itemcdn.tmall.com\/1688offer\/....html"
  const m = blob.match(/"detailUrl"\s*:\s*"([^"]+)"/i);
  if (!m) return null;
  let url = m[1];
  url = url.replace(/\\u002F/g,'/');
  url = url.replace(/\\\//g,'/');
  url = url.replace(/&amp;/g,'&');
  if (url.startsWith('//')) url = location.protocol + url;
  return url;
}

function findDescIframeUrl(){
  const iframes = Array.from(document.querySelectorAll('iframe'));
  for (const fr of iframes){
    const src = fr.getAttribute('src') || '';
    if (/offer_desc\.htm|desc\.htm|description/i.test(src)) {
      return normalizeUrl(src);
    }
  }
  return null;
}

async function fetchTextViaSW(url){
  if (!url) return null;
  return await new Promise((resolve)=>{
    chrome.runtime.sendMessage({type:'FETCH_TEXT', url}, (resp)=>{
      if (!resp?.ok) return resolve(null);
      resolve(resp.text || null);
    });
  });
}

async function collectDetailsImages(){
  // Preferred: detailUrl (itemcdn.tmall.com/1688offer/...)
  const detailUrl = findDetailUrlFromScripts();
  if (detailUrl){
    const html = await fetchTextViaSW(detailUrl);
    if (html) return uniq(extractImgUrlsFromText(html));
  }

  // Fallback: description iframe URL (offer_desc/desc)
  const iframeUrl = findDescIframeUrl();
  if (iframeUrl){
    const html = await fetchTextViaSW(iframeUrl);
    if (html) return uniq(extractImgUrlsFromText(html));
  }

  // Last resort: DOM scan (often contains only placeholders)
  const maybe = collectDomImgs(document);
  // Heuristic: details images frequently are long and not from the main gallery; but we cannot reliably detect.
  return uniq(maybe);
}

function parseGalleryAndSkuFromScripts(){
  const blob = collectEmbeddedScriptText();
  const main=[];
  const sku=[];

  // Pull "mainImage":["url1","url2",...] if present
  const mainMatch = blob.match(/"mainImage"\s*:\s*\[(.*?)\]/s);
  if (mainMatch){
    const block = mainMatch[1];
    const urls = block.match(/"(https?:\\\/\\\/[^\"]+|\\\/\\\/[^\"]+)"/g) || [];
    for (const raw of urls){
      let u = raw.slice(1,-1);
      u = u.replace(/\\u002F/g,'/').replace(/\\\//g,'/');
      main.push(normalizeUrl(u));
    }
  }

  // Pull common sku-image patterns: "imageUrl" or "image" within skuModel
  const skuBlocks = blob.match(/"skuModel"[\s\S]*?\}\s*,\s*"/g) || [];
  const skuText = skuBlocks.join('\n') || blob;
  const skuUrls = skuText.match(/"(?:imageUrl|image|imgUrl)"\s*:\s*"([^"]+)"/ig) || [];
  for (const pair of skuUrls){
    const m = pair.match(/:\s*"([^"]+)"/);
    if (!m) continue;
    let u = m[1].replace(/\\u002F/g,'/').replace(/\\\//g,'/');
    sku.push(normalizeUrl(u));
  }

  return {main: uniq(main).filter(Boolean), sku: uniq(sku).filter(Boolean)};
}

function splitMainSkuFromDom(){
  const mainSet = new Set();
  const skuSet = new Set();

  const gallery = document.querySelector('[class*="gallery"],[class*="swiper"],[class*="slider"],[class*="pic"],[class*="image"],[class*="preview"]');
  collectDomImgs(gallery || document).forEach(u=>mainSet.add(u));

  const skuRoot = document.querySelector('[class*="sku"],[class*="spec"],[class*="prop"],[id*="sku"],[id*="spec"],[class*="od-sku"],[class*="sku-selection"]');
  collectDomImgs(skuRoot || document).forEach(u=>skuSet.add(u));

  return {main: Array.from(mainSet), sku: Array.from(skuSet)};
}

function findVideoUrlFromPage(){
  const v = document.querySelector('video');
  if (v){
    const s1 = v.currentSrc || v.src;
    if (s1) return normalizeUrl(s1);
    const s2 = v.querySelector('source')?.getAttribute('src');
    if (s2) return normalizeUrl(s2);
  }
  const scripts = Array.from(document.scripts || []);
  const blob = scripts.map(s => s.textContent || '').join('\n');
  let m = blob.match(/"videoUrl"\s*:\s*"([^"]+)"/i);
  if (m && m[1]) return normalizeUrl(m[1].replace(/\\u002F/g,'/').replace(/\\\//g,'/'));
  m = blob.match(/"wirelessVideo"\s*:\s*\{[\s\S]*?"videoUrls"\s*:\s*\{[\s\S]*?"(ios|android)"\s*:\s*"([^"]+)"/i);
  if (m && m[2]) return normalizeUrl(m[2].replace(/\\u002F/g,'/').replace(/\\\//g,'/'));
  m = blob.match(/https?:\/\/[^"'\\\s<>]+?\.(?:mp4|m3u8|webm|mov)(?:\?[^"'\\\s<>]*)?/i);
  if (m && m[0]) return normalizeUrl(m[0]);
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try{
      if (msg?.type !== 'SCRAPE_COLLECT') return;

      const productName = getProductName();

      // Prefer structured script parsing, then merge with DOM-derived URLs.
      const fromScripts = parseGalleryAndSkuFromScripts();
      const fromDom = splitMainSkuFromDom();

      const main = uniq([...(fromScripts.main||[]), ...(fromDom.main||[])]).filter(Boolean);
      const sku = uniq([...(fromScripts.sku||[]), ...(fromDom.sku||[])]).filter(Boolean);

      const details = await collectDetailsImages();

      const videoUrl = findVideoUrlFromPage();
      sendResponse({ok:true, productName, groups:{main, sku, details}, videoUrl});
    }catch(e){
      sendResponse({ok:false, error: String(e?.message||e)});
    }
  })();
  return true;
});
