async function testWorkflow() {
  console.log(`Testing Podcast...`);
  try {
    const res = await fetch(`http://localhost:3000/api/workflows/podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: 'https://www.youtube.com/watch?v=M7FIvfx5J10' })
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log(`Podcast: ${res.status}`, data);
    } catch(e) {
      console.log(`Podcast: ${res.status}`, text);
    }
  } catch (err) {
    console.error(`Podcast failed:`, err.message);
  }
}
testWorkflow();
