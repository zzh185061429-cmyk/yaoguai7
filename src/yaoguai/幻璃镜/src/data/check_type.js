const fs = require('fs');
const c = fs.readFileSync('d:/BaiduNetdiskDownload/tavern_helper_template-main/src/yaoguai/幻璃镜/src/data/locationImages.ts', 'utf8');
const withType = c.match(/type:\s*'(indoor|outdoor)'/g);
console.log('有type字段的:', withType ? withType.length : 0);
const indoorCount = c.match(/type:\s*'indoor'/g);
const outdoorCount = c.match(/type:\s*'outdoor'/g);
console.log('indoor:', indoorCount ? indoorCount.length : 0);
console.log('outdoor:', outdoorCount ? outdoorCount.length : 0);
