function sanitizeName(name){
  name = (name || '1688_product').toString().trim();
  name = name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g,' ').trim();
  if (!name) name='1688_product';
  if (name.length>80) name=name.slice(0,80);
  return name;
}
function pad3(n){ return String(n).padStart(3,'0'); }

async function getActiveTab(){
  const tabs = await chrome.tabs.query({active:true, currentWindow:true});
  return tabs && tabs[0];
}

function uniq(arr){
  const seen=new Set(); const out=[];
  for (const x of arr){ if (!x) continue; const k=String(x); if (seen.has(k)) continue; seen.add(k); out.push(k); }
  return out;
}

async function fetchImageSize(url, timeoutMs=12000){
  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort('timeout'), timeoutMs);
  try{
    const res = await fetch(url, {signal: ctrl.signal, credentials:'omit', mode:'cors'});
    if (!res.ok) return null;
    const blob = await res.blob();
    // createImageBitmap is available in SW in modern Chromium
    const bmp = await createImageBitmap(blob);
    const w = bmp.width, h = bmp.height;
    bmp.close && bmp.close();
    return {w,h};
  }catch(e){
    return null;
  }finally{
    clearTimeout(to);
  }
}

function guessExt(url){
  const m = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i);
  if (!m) return 'jpg';
  const ext = m[1].toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

function guessVideoExt(url){
  const m = String(url||'').match(/\.(mp4|m3u8|webm|mov)(\?|#|$)/i);
  return m ? m[1].toLowerCase() : 'mp4';
}
async function downloadVideoBase(folder, url){
  const ext = guessVideoExt(url);
  const filename = `${folder}/video.${ext}`;
  await chrome.downloads.download({url, filename, conflictAction:'uniquify', saveAs:false});
}


async function downloadOne(folder, sub, idx, url){
  const ext = guessExt(url);
  const filename = `${folder}/${sub}/${pad3(idx)}.${ext}`;
  await chrome.downloads.download({url, filename, conflictAction:'uniquify', saveAs:false});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try{
      // Utility: fetch arbitrary text (used by content script to retrieve detail HTML via detailUrl/iframes)
      if (msg?.type === 'FETCH_TEXT') {
        const url = String(msg.url || '');
        if (!/^https?:\/\//i.test(url)) { sendResponse({ok:false, error:'Bad url'}); return; }
        try{
          const res = await fetch(url, {credentials:'omit', cache:'no-store'});
          const text = await res.text();
          sendResponse({ok:true, status: res.status, url: res.url, text});
        }catch(e){
          sendResponse({ok:false, error: String(e?.message||e)});
        }
        return;
      }

      if (msg?.type !== 'SCRAPE_DOWNLOAD') return;

      const tab = await getActiveTab();
      if (!tab?.id) { sendResponse({ok:false, error:'No active tab.'}); return; }
      if (!/^https:\/\/detail\.1688\.com\/offer\//.test(tab.url||'')) {
        sendResponse({ok:false, error:'Open a 1688 offer page: https://detail.1688.com/offer/...' });
        return;
      }

      // Ensure content script is ready
      const minSize = Math.max(1, parseInt(msg.minSize||500,10));
      let resp;
      try{
        resp = await chrome.tabs.sendMessage(tab.id, {type:'SCRAPE_COLLECT', minSize});
      }catch(e){
        sendResponse({ok:false, error:'Content script not reachable. Refresh the page once and try again.'});
        return;
      }
      if (!resp?.ok) { sendResponse({ok:false, error: resp?.error || 'Scrape failed'}); return; }

      const productName = sanitizeName(resp.productName);
      const groups = resp.groups || {main:[], sku:[], details:[]};
      const videoUrl = resp.videoUrl || null;

      // Dedup
      for (const k of ['main','sku','details']) groups[k] = uniq(groups[k]);

      // Filter by size
      const filtered = {main:[], sku:[], details:[]};
      const checked = new Map();
      const noteParts=[];
      for (const k of ['details','main','sku']){ // check details first
        for (const u of groups[k]){
          if (!u) continue;
          if (checked.has(u)) {
            const ok = checked.get(u);
            if (ok) filtered[k].push(u);
            continue;
          }
          const sz = await fetchImageSize(u);
          const ok = !!(sz && sz.w>=minSize && sz.h>=minSize);
          checked.set(u, ok);
          if (ok) filtered[k].push(u);
        }
      }

      const counts = {main: filtered.main.length, sku: filtered.sku.length, details: filtered.details.length};

      let downloaded = 0;

      // optional: download main video into base folder
      if (videoUrl) {
        try { await downloadVideoBase(productName, videoUrl); } catch(e) {}
      }

      for (const k of ['details','main','sku']){
        let i=1;
        for (const u of filtered[k]){
          await downloadOne(productName, k, i++, u);
          downloaded++;
        }
      }

      let note='';
      if (downloaded===0) {
        note = 'No images >= min size. If the page uses lazy/JS data, try scrolling to the details section and click the 详情/图文详情 tab once, then run again.';
      }

      sendResponse({ok:true, counts, downloaded, note});
    }catch(e){
      sendResponse({ok:false, error: String(e?.message||e)});
    }
  })();
  return true;
});
