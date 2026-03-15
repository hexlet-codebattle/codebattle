# Ars

Terminal-based load generator for Codebattle Swiss tournaments.

## TUI flow

- `c` creates a tournament scenario through `ext_api` and prepares synthetic users
- `j` makes the prepared users join the created tournament
- `s` starts the created tournament through the admin channel
- `t` fetches task solutions for the current round
- `1` / `2` switch all workers to `python` / `cpp`
- `+` / `-` change typing delay in milliseconds
- `p` / `u` pause or resume all workers
- `e` opens settings
- `q` quits

## Run

```bash
cd tools/ars
go run ./cmd/ars \
  -server http://localhost:4000 \
  -auth-key x-key \
  -users 200 \
  -rounds 3 \
  -break-seconds 5 \
  -avg-task-seconds 10 \
  -randomness 25 \
  -join-ramp-seconds 5 \
  -langs python,cpp
```

If the server-side task solution endpoint returns `422`, set the language solution manually from the terminal UI.
