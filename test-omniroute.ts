import { complete } from './lib/ai/llm';

async function test() {
  console.log("Testing OmniRoute connection...");
  try {
    const res = await complete({
      system: "You are a helpful assistant.",
      user: "Respond with the word 'SUCCESS' if you can hear me!"
    });
    console.log("Response from OmniRoute:", res);
  } catch (err) {
    console.error("Error connecting to OmniRoute:", err);
  }
}

test();
