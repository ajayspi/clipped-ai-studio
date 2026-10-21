const fs = require('fs');

const filePath = 'C:\\Users\\vigilare\\.gemini\\antigravity\\scratch\\clipped\\components\\wizard\\CreationWizard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace </> with </div> before </main>
content = content.replace(
  '        </>\r\n      </main>',
  '      </div>\r\n      </main>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed main closing');