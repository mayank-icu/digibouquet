const fs = require('fs');
const h = fs.readFileSync('assets/svgs/history-screen.svg', 'utf8');
const n = fs.readFileSync('assets/svgs/no-notifications.svg', 'utf8');
const c = fs.readFileSync('assets/svgs/cherry-blossom-ham.svg', 'utf8');
const s = fs.readFileSync('assets/svgs/scheduled-email.svg', 'utf8');
const u = fs.readFileSync('assets/svgs/under-construction.svg', 'utf8');
const b = fs.readFileSync('assets/svgs/no-bouquet-home.svg', 'utf8');

let out = '';
out += 'export const historySvg = `' + h.replace(/`/g, '\\`') + '`;\n';
out += 'export const noNotificationsSvg = `' + n.replace(/`/g, '\\`') + '`;\n';
out += 'export const cherryBlossomHamSvg = `' + c.replace(/`/g, '\\`') + '`;\n';
out += 'export const scheduledEmailSvg = `' + s.replace(/`/g, '\\`') + '`;\n';
out += 'export const underConstructionSvg = `' + u.replace(/`/g, '\\`') + '`;\n';
out += 'export const noBouquetHomeSvg = `' + b.replace(/`/g, '\\`') + '`;\n';

fs.writeFileSync('src/svgStrings.js', out);
console.log('Generated svgStrings.js with new svgs');
