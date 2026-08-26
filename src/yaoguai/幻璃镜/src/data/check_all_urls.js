const fs = require('fs');
const path = require('path');

// 读取 locationImages.ts 中的所有 URL
const liContent = fs.readFileSync(path.join(__dirname, 'locationImages.ts'), 'utf8');
const allUrls = new Set();
const urlRegex = /'(https:\/\/i\.postimg\.cc[^']+)'/g;
let m;
while ((m = urlRegex.exec(liContent)) !== null) {
  allUrls.add(m[1]);
}
console.log('locationImages.ts 中的 URL 数:', allUrls.size);

// 读取 manifest.json 中的所有 URL
const manifestPath = 'd:/BaiduNetdiskDownload/妖怪/地图/manifest.json';
let manifestUrls = new Set();
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  function extractUrls(obj) {
    if (typeof obj === 'string') {
      if (obj.includes('i.postimg.cc')) manifestUrls.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(extractUrls);
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(extractUrls);
    }
  }
  extractUrls(manifest);
  console.log('manifest.json 中的 URL 数:', manifestUrls.size);
} catch (e) {
  console.log('无法读取 manifest.json:', e.message);
}

// 找出 manifest 中有但 locationImages.ts 中没有的 URL
const missing = [...manifestUrls].filter(u => !allUrls.has(u));
console.log('\nmanifest 中有但 locationImages.ts 中缺失的 URL:', missing.length);
if (missing.length > 0) {
  missing.forEach(u => console.log('  ' + u));
}

// 找出 locationImages.ts 中有但 manifest 中没有的 URL（可能路径不对）
const extra = [...allUrls].filter(u => !manifestUrls.has(u));
console.log('\nlocationImages.ts 中有但 manifest 中没有的 URL:', extra.length);
if (extra.length > 0) {
  extra.slice(0, 20).forEach(u => console.log('  ' + u));
  if (extra.length > 20) console.log('  ... 还有 ' + (extra.length - 20) + ' 条');
}
