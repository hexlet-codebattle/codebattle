defmodule Mix.Tasks.Codebattle.Antibot.Evaluate do
  @shortdoc "Evaluate current reports against latest moderator decisions (read only)"
  @moduledoc "Run with ./bin/dev mix codebattle.antibot.evaluate. No reports or decisions are changed."
  use Mix.Task

  import Ecto.Query

  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.BotDetection.Evaluation
  alias Codebattle.Game.BotDetection.Review
  alias Codebattle.Repo

  def run(_args) do
    Mix.Task.run("app.config")
    {:ok, _} = Application.ensure_all_started(:ecto_sql)
    {:ok, _} = Application.ensure_all_started(:postgrex)
    start_reader(Repo, fn -> Repo.start_link() end)
    start_reader(Codebattle.Registry, fn -> Registry.start_link(keys: :unique, name: Codebattle.Registry) end)

    {:ok, result} =
      Repo.transaction(
        fn ->
          Repo.query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
          evaluate()
        end,
        timeout: to_timeout(minute: 30)
      )

    Mix.shell().info(Jason.encode!(result, pretty: true))
  end

  defp start_reader(name, start) do
    if is_nil(Process.whereis(name)), do: {:ok, _} = start.()
  end

  defp evaluate do
    reviews =
      from(r in Review, join: g in assoc(r, :game), where: g.state in ["game_over", "timeout"], order_by: [desc: r.id])
      |> Repo.all()
      |> Enum.uniq_by(&{&1.game_id, &1.user_id})

    analyses =
      reviews
      |> Enum.map(& &1.game_id)
      |> Enum.uniq()
      |> Map.new(fn id ->
        {:ok, rows} = BotDetection.analyze_game(id)
        {id, Map.new(rows, &{&1.user_id, &1})}
      end)

    cases =
      Enum.flat_map(reviews, fn r ->
        case analyses[r.game_id][r.user_id] do
          nil ->
            []

          analysis ->
            [
              %{
                user_id: r.user_id,
                outcome: r.outcome,
                score: analysis.score,
                lang: analysis.final_lang || "unknown",
                collectors: collector_cohort(analysis.stats)
              }
            ]
        end
      end)

    result =
      cases
      |> Evaluation.summarize()
      |> Map.merge(%{
        missing_analysis: length(reviews) - length(cases),
        by_language: breakdown(cases, :lang),
        by_collector_version: breakdown(cases, :collectors)
      })

    result
  end

  defp collector_cohort(nil), do: "missing"
  defp collector_cohort(stats), do: Enum.join(stats.collector_versions, ",")

  defp breakdown(cases, field) do
    cases |> Enum.group_by(&Map.fetch!(&1, field)) |> Map.new(fn {key, rows} -> {key, Evaluation.summarize(rows)} end)
  end
end
