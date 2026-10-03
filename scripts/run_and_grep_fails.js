const { execSync } = require('child_process');

try {
  const output = execSync('node tests/e2e/standalone-runner.js', { encoding: 'utf8' });
  console.log("Passed without errors");
} catch (error) {
  const out = error.stdout || '';
  const lines = out.split('\n');
  let failures = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('FAIL')) {
      failures.push(lines[i]);
      if (lines[i+1]) failures.push(lines[i+1]);
      if (lines[i+2]) failures.push(lines[i+2]);
    }
  }
  console.log(failures.join('\n'));
}
