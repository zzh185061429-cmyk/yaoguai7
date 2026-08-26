// 分析 locationImages.ts 中所有条目的变体类型
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'locationImages.ts');
const content = fs.readFileSync(filePath, 'utf8');

// 提取 RESIDENT_LOCATIONS 和 TEMPLATE_LOCATIONS 的所有 key 和 variants
const residentMatch = content.match(/export const RESIDENT_LOCATIONS[^{]*\{([\s\S]*?)\n\};/);
const templateMatch = content.match(/export const TEMPLATE_LOCATIONS[^{]*\{([\s\S]*?)\n\};/);

function parseEntries(block) {
  const entries = [];
  // 匹配每个条目: 'key': { name: ..., ... variants: { 'v1': 'url', ... } }
  const entryRegex = /'([^']+)':\s*\{\s*name:\s*'([^']+)',[\s\S]*?variants:\s*\{([^}]*)\}/g;
  let m;
  while ((m = entryRegex.exec(block)) !== null) {
    const key = m[1];
    const name = m[2];
    const variantsBlock = m[3];
    const variantRegex = /'([^']+)':\s*'([^']+)'/g;
    const variants = [];
    let vm;
    while ((vm = variantRegex.exec(variantsBlock)) !== null) {
      variants.push(vm[1]);
    }
    entries.push({ key, name, variants });
  }
  return entries;
}

const residents = residentMatch ? parseEntries(residentMatch[1]) : [];
const templates = templateMatch ? parseEntries(templateMatch[1]) : [];

// 分类
const indoorVariants = ['昼', '夜'];
const outdoorVariants = ['晴昼', '晴夜', '阴昼', '阴夜', '雪昼', '雪夜'];

console.log('=== 常驻地点 ===');
console.log('总数:', residents.length);

const indoor = residents.filter(r => r.variants.every(v => indoorVariants.includes(v)));
const outdoor = residents.filter(r => r.variants.every(v => outdoorVariants.includes(v)));
const mixed = residents.filter(r => !indoor.includes(r) && !outdoor.includes(r));

console.log('室内(仅昼/夜):', indoor.length);
console.log('室外(晴阴雪×昼夜):', outdoor.length);
console.log('混合/其他:', mixed.length);

if (mixed.length > 0) {
  console.log('\n混合/其他条目:');
  mixed.forEach(r => console.log(`  ${r.key} => ${r.variants.join(', ')}`));
}

console.log('\n=== 模板池 ===');
console.log('总数:', templates.length);
const tIndoor = templates.filter(r => r.variants.every(v => indoorVariants.includes(v)));
const tOutdoor = templates.filter(r => r.variants.every(v => outdoorVariants.includes(v)));
const tMixed = templates.filter(r => !tIndoor.includes(r) && !tOutdoor.includes(r));
console.log('室内:', tIndoor.length);
console.log('室外:', tOutdoor.length);
console.log('混合/其他:', tMixed.length);
if (tMixed.length > 0) {
  console.log('\n混合/其他模板:');
  tMixed.forEach(r => console.log(`  ${r.name} => ${r.variants.join(', ')}`));
}

// 检查室内条目列表
console.log('\n=== 室内常驻地点列表 ===');
indoor.forEach(r => console.log(`  ${r.key}`));

console.log('\n=== 室外常驻地点列表 ===');
outdoor.forEach(r => console.log(`  ${r.key}`));
