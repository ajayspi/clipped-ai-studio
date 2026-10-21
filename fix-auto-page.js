const fs = require('fs');

const filePath = 'C:\\Users\\vigilare\\.gemini\\antigravity\\scratch\\clipped\\app\\' + '(app)' + '\\create\\auto\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the FormField labels - they have </FormField> or </FormSection> inside the label prop which is invalid
// Pattern: label={<><Icon ... /> Text</FormField>} -> label={<><Icon ... /> Text</>}
// Pattern: label={<><Icon ... /> Text</FormSection>} -> label={<><Icon ... /> Text</>}

content = content.replace(
  /label=\{<><([^<]+)<\/FormField>\}/g,
  'label={<>$1</>}'
);

content = content.replace(
  /label=\{<><([^<]+)<\/FormSection>\}/g,
  'label={<>$1</>}'
);

content = content.replace(
  /label=\{<><([^<]+)<\/FormField>\}/g,
  'label={<>$1</>}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed auto/page.tsx');