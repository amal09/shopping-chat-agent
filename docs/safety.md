# Safety Strategy (Planned)

## Threats
- Prompt injection (“ignore rules”, “reveal system prompt”)
- Requests for secrets (API keys, internal prompts)
- Toxic / defamatory requests (“trash brand X”)
- Hallucinated specs (not present in dataset)

## Approach
- Detect adversarial intent and refuse
- Only answer using facts present in our catalog dataset
- Neutral, factual tone
- If data is missing: explicitly say it's not available in our catalog
