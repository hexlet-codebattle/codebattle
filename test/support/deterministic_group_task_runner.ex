defmodule CodebattleWeb.DeterministicGroupTaskRunner do
  @moduledoc """
  Deterministic HTTP client mock for group-task runner integration tests.

  Configure with `Process.put(:deterministic_runner_scores, %{user_id => score, ...})`.
  When `post/2` is invoked, the mock inspects the request payload's
  `solutions` list, ranks players by their configured score (descending,
  ties broken by player_id ascending so behaviour is reproducible), and
  returns a `summary.ranking` shaped exactly like the real grid_gold runner.

  Players without a score in the map default to 0.
  Records the last request in `:group_task_runner_last_request` for assertions.
  """

  def post(url, opts) do
    Process.put(:group_task_runner_last_request, %{url: url, opts: opts})

    # Read from Application env so concurrent Task.async_stream workers (which
    # spawn fresh processes without inheriting Process dict) all see the same
    # configured scores.
    scores = Application.get_env(:codebattle, :deterministic_runner_scores, %{})

    payload = opts[:json] || %{}
    solutions = Map.get(payload, :solutions) || Map.get(payload, "solutions") || []

    ranked =
      solutions
      |> Enum.map(fn s ->
        pid = Map.get(s, :player_id) || Map.get(s, "player_id")
        score = Map.get(scores, pid, 0)
        {pid, score}
      end)
      |> Enum.sort_by(fn {pid, score} -> {-score, pid} end)
      |> Enum.with_index()
      |> Enum.map(fn {{pid, score}, idx} ->
        %{
          "player_id" => pid,
          "score" => score,
          "place" => idx + 1,
          "duration_ms" => Map.get(scores, {:duration, pid}, 100)
        }
      end)

    body = %{
      "summary" => %{
        "ranking" => ranked,
        "players" => solutions
      },
      "history" => []
    }

    response = {:ok, %Req.Response{status: 200, body: body}}

    Process.put(:deterministic_runner_last_response, response)

    response
  end
end
