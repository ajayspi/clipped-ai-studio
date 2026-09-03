fetch("http://150.230.139.174/api/workflows/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflow: "footage",
    script: "A beautiful sunset over the mountains, with a river flowing.",
    voice: "alloy"
  })
}).then(res => res.json()).then(console.log).catch(console.error);
