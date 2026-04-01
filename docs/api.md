# GoPromptUp API (MVP)

## Health

- `GET /api/healthz`

## Submit Prompt

- `POST /api/prompts`
- Header: `x-epheme-token`
- Body:

```json
{
  "model": "gpt",
  "title": "optional",
  "body": "required"
}
```

## List Leaderboard

- `GET /api/prompts?model=gpt&window=alltime&sort=top&limit=30`
- `window`: `today | week | alltime`
- `sort`: `top | new`

## Vote

- `POST /api/prompts/:id/vote`
- Header: `x-epheme-token`
- Body:

```json
{
  "direction": 1
}
```

- `direction`: `1` or `-1`
- One vote per token+prompt+UTC-day
- Same day vote changes overwrite previous vote
