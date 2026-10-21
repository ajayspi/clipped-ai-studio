const fs = require('fs');

const file = 'AGENTS.md';
let code = fs.readFileSync(file, 'utf8');

// The original text to replace:
const targetText = "(b) `bulk-plan`, `mission`, `scrape`, `whiteboard/character-sheet` leave the column **unset**, which defaults to the claimable `'queued'`, write **no `beats`**, and therefore make the worker build an empty `concat.txt` -> `ffmpeg ... Invalid data found when processing input` on all 3 attempts (reproduced live). Tier 20 only guards the *insert* side, so it cannot see (b) — the failure there is \"column left to its default\", not a wrong value.";

const replacementText = "(b) `mission` and `whiteboard/character-sheet` leave the column **unset**, which defaults to the claimable `'queued'`, write **no `beats`**, and therefore make the worker build an empty `concat.txt` -> `ffmpeg ... Invalid data found when processing input` on all 3 attempts (reproduced live). (Note: `scrape` and `bulk-plan` do not insert into render_jobs at all, and the `images` route error path also omits orchestration_state). Tier 20 only guards the *insert* side, so it cannot see (b) — the failure there is \"column left to its default\", not a wrong value.";

code = code.replace(targetText, replacementText);

fs.writeFileSync(file, code);
