## Evaluation: ticket triage classifier

### How it was measured

- **Dataset:** 20 hand-labeled support tickets (14 with a clear category, 6 that should go to a human: mixed issues, nonsense, a vague message, an angry message with no details, and 2 prompt-injection attempts).
- **Runs:** each ticket classified twice, 40 classifications in total.
- **Model:** `gemini-3.5-flash-lite`, Gemini free tier (15 requests per minute), with a 2.5 second pause between tickets.
- **Routing rule being tested:** a ticket is auto-handled only if the category is not `unknown` and confidence is at least the threshold (0.7 here). Everything else goes to a human.

Run it yourself: `npx tsx src/eval-triage.ts`

### Results

| Metric | Result |
|---|---|
| Calls completed (valid answer within 3 attempts) | 40 of 40 |
| Category matched my label | 40 of 40 |
| Auto-handled | 28 |
| Auto-handled **and wrong** (the dangerous case) | 0 |
| Tickets labeled "needs a human" that reached a human | 12 of 12 |
| Needless escalations | 0 |
| Same ticket, different category across runs | 0 of 20 |
| Tokens per call | about 159 on average (6,346 in total) |
| Typical latency of a clean call | about 2.4 to 2.8 seconds (earlier runs, no retries) |

The reported mean latency of the final run was about 8.9 seconds. That number includes the time spent waiting between retries, so it overstates normal latency.

### What went wrong while measuring (and what I changed)

1. **Rate limiting (HTTP 429).** My first run completed only 80% of calls: 8 of 40 failed because I sent about 20 requests per minute against a 15 per minute limit, and my retries fired instantly, so they were guaranteed to fail too. Fix: a pause between tickets.
2. **Network failures (`fetch failed`).** A later run lost 9 calls to connection errors. Fix: retries now wait 10 s, then 20 s, for rate-limit and network errors, and the real error cause is recorded.
3. **Lesson:** failed calls are tracked separately from wrong answers. A call that never reached the model says nothing about the model's judgment, and mixing the two made my first report misleading.

### Limitations (read before trusting these numbers)

- **Small sample.** 20 tickets means one ticket moves a percentage by 5 points. The two runs use the same tickets, so they are not 40 independent tests.
- **Labels are my own judgment** and the dataset was drafted with AI assistance, so it may favor the model's habits. Real customer tickets would be a harder test.
- **The escalation rate (30%) is set by the dataset,** because 6 of the 20 tickets were chosen to need a human. It is not a real-world estimate.
- **The confidence threshold is not data-driven.** The model only produced extreme confidence values (at least 0.9 for clear tickets, 0.4 or lower for unclear ones), so any threshold between 0.5 and 0.9 gave identical results. I chose by cost: a wrong automatic action is more expensive than an unnecessary escalation.
- **The `unknown` rule matters.** A prompt-injection ticket was classified `unknown` with 0.9 confidence. Without the rule that sends every `unknown` to a human, it would pass a 0.7 threshold.
- **Not covered by this eval:** the BullMQ action queue and the human-approval pause. They were tested manually. Dollar cost is not computed yet.
