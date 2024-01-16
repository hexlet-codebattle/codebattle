defmodule Codebattle.Tournament.Round.Context do
  @moduledoc false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Round

  def update_struct(round, params) do
    Map.merge(round, params)
  end

  @spec upsert!(Tournament.t()) :: Round.t()
  def build(tournament) do
    %Round{
      state: "active",
      break_duration_seconds: tournament.break_duration_seconds,
      level: tournament.level,
      player_ids: Tournament.Players.get_players(tournament) |> Enum.map(& &1.id),
      task_provider: tournament.task_provider,
      task_strategy: tournament.task_strategy,
      tournament_id: tournament.id,
      tournament_type: tournament.type,
      use_infinite_break: tournament.use_infinite_break
    }
    |> add_round_timeout_and_task_pack(tournament)
  end

  @spec upsert!(Round.t()) :: Round.t()
  def upsert!(round) do
    round
    |> Map.put(:updated_at, TimeHelper.utc_now())
    |> Codebattle.Repo.insert!(
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  @spec upsert_all(list(Round.t())) :: list(Round.t())
  def upsert_all(rounds) do
    rounds =
      rounds
      |> Enum.map(&(&1 |> Map.put(:updated_at, TimeHelper.utc_now())))

    Codebattle.Repo.insert_all(
      Round,
      rounds,
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  @spec add_round_timeout_and_task_pack(Round.t(), Tournament.t()) :: Round.t()
  defp add_round_timeout_and_task_pack(
         round,
         tournament = %{
           meta: %{rounds_config_type: "per_round", rounds_config: rounds_config}
         }
       ) do
    round_config = Enum.at(rounds_config, tournament.current_round_position)

    update_struct(round, %{
      round_timeout_seconds: Map.get(round_config, :round_timeout_seconds, nil),
      task_pack_id: Map.get(round_config, :task_pack_id, nil)
    })
  end

  defp add_round_timeout_and_task_pack(round, tournament) do
    update_struct(round, %{
      round_timeout_seconds: tournament.match_timeout_seconds,
      task_pack_id: Map.get(tournament.meta, :task_pack_id, nil)
    })
  end
end
