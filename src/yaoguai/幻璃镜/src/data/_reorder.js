const fs = require('fs');
const path = 'd:/BaiduNetdiskDownload/tavern_helper_template-main/src/yaoguai/幻璃镜/src/data/locationHierarchy.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// 0-indexed boundaries:
// Line 37 (0-idx) = "export const REALM_REGIONS: RealmRegion[] = [" (line 38 1-idx)
// Lines 38-40 (0-idx) = 皇城注释 (lines 39-41 1-idx)
// ...
// Line 5356 (0-idx) = "  }," 远征结束 (line 5357 1-idx)
// Line 5357 (0-idx) = "" 空行 (line 5358 1-idx)
// Lines 5358-6050 (0-idx) = 宫城注释+对象 (lines 5359-6051 1-idx)
// Line 6051 (0-idx) = "];" 数组结束 (line 6052 1-idx)

// Verify boundaries
console.log('Line 38 (1-idx):', lines[37]); // export const
console.log('Line 5357 (1-idx):', lines[5356]); // 远征结束 },
console.log('Line 5358 (1-idx):', JSON.stringify(lines[5357])); // 空行
console.log('Line 5359 (1-idx):', lines[5358]); // 宫城注释
console.log('Line 6051 (1-idx):', lines[6050]); // 宫城结束 },
console.log('Line 6052 (1-idx):', lines[6051]); // ];
console.log('Total lines:', lines.length);

// Extract parts
const headerLines = lines.slice(0, 38); // 0..37 = up to and including "export const REALM_REGIONS: RealmRegion[] = ["
const gongchengLines = lines.slice(5358, 6051); // 5358..6050 = 宫城注释+对象
const middleLines = lines.slice(38, 5357); // 38..5356 = 皇城注释 到 远征结束 },
const footerLines = lines.slice(6051); // 6051..end = "];" and beyond

// Assemble
const result = [
  ...headerLines,
  ...gongchengLines,
  '', // 空行分隔
  ...middleLines,
  ...footerLines
].join('\n');

fs.writeFileSync(path, result, 'utf8');
const newLines = fs.readFileSync(path, 'utf8').split('\n');
console.log('New total lines:', newLines.length);
console.log('Verify line 39 (1-idx):', newLines[38]); // 应该是宫城注释
console.log('Verify line 6052 area:', newLines[6051]);
