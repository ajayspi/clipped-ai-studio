async function testWorkflow(name, endpoint, payload) {
  console.log(`Testing ${name}...`);
  try {
    const res = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log(`${name}: ${res.status}`, data);
    } catch(e) {
      console.log(`${name}: ${res.status}`, text);
    }
  } catch (err) {
    console.error(`${name} failed:`, err.message);
  }
}

async function runAll() {
  await testWorkflow('Stories', '/api/workflows/stories', { topic: 'A short story about a time traveling cat' });
  await testWorkflow('Auto', '/api/workflows/generate', { script: 'A cinematic drone shot of a snowy mountain. The camera pans down to reveal a small village.', workflow: 'auto', aspectRatio: '16:9', duration: 15, subject: 'Mountain' });
  console.log('Tests dispatched!');
}

runAll();
