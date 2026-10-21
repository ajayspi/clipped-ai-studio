const fs = require('fs');

const filePath = 'C:\\\\Users\\\\vigilare\\\\.gemini\\\\antigravity\\\\scratch\\\\clipped\\\\components\\\\wizard\\\\CreationWizard.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const mainStart = c.indexOf('<main className=');
const mainEnd = c.indexOf('</main>');

if(mainStart >= 0 && mainEnd >= 0) {
  const mainContent = c.substring(mainStart, mainEnd + 7);
  const lines = mainContent.split('\n');
  let divCount = 0;
  lines.forEach((line, i) => {
    const openDivs = (line.match(/<div/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    divCount += openDivs - closeDivs;
    if(divCount !== 0) {
      console.log('Line', i+1, 'divCount:', divCount, '|', line.trim().substring(0, 100));
    }
  });
}