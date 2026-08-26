const fs = require('fs');
const path = require('path');

// 读取 locationImages.ts 中的所有 URL
const liContent = fs.readFileSync(path.join(__dirname, 'locationImages.ts'), 'utf8');
const liUrls = new Set();
const urlRegex = /'(https:\/\/i\.postimg\.cc[^']+)'/g;
let m;
while ((m = urlRegex.exec(liContent)) !== null) {
  liUrls.add(m[1]);
}
console.log('locationImages.ts 中的 URL 数:', liUrls.size);

// 递归扫描图床链接.txt 文件
const basePath = 'd:/BaiduNetdiskDownload/妖怪/地图/燕京';
const txtUrls = new Set();

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (item.includes('图床链接') && item.endsWith('.txt')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/https:\/\/i\.postimg\.cc[^\s\n\r]+/g);
      if (matches) {
        matches.forEach(u => {
          // 去掉末尾可能有的标点
          const cleanUrl = u.replace(/[，。,;；\s]+$/, '');
          txtUrls.add(cleanUrl);
        });
      }
    }
  }
}

try {
  scanDir(basePath);
  console.log('图床链接.txt 中的 URL 数:', txtUrls.size);
} catch (e) {
  console.log('扫描目录失败:', e.message);
}

// 找出图床链接.txt 中有但 locationImages.ts 中缺失的 URL
const missing = [...txtUrls].filter(u => !liUrls.has(u));
console.log('\n图床链接.txt 中有但 locationImages.ts 中缺失的 URL:', missing.length);
if (missing.length > 0) {
  missing.forEach(u => console.log('  ' + u));
}

// 反向
const extra = [...liUrls].filter(u => !txtUrls.has(u));
console.log('\nlocationImages.ts 中有但图床链接.txt 中没有的 URL:', extra.length);
if (extra.length > 0 && extra.length <= 20) {
  extra.forEach(u => console.log('  ' + u));
} else if (extra.length > 20) {
  extra.slice(0, 20).forEach(u => console.log('  ' + u));
  console.log('  ... 还有 ' + (extra.length - 20) + ' 条');
}
