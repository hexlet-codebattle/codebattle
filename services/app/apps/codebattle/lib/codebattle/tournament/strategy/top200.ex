defmodule Codebattle.Tournament.Top200 do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    player_pairs =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.id)
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
    wait_type = get_wait_type(tournament, game_params)

    if wait_type == "rematch" do
      Process.send_after(
        self(),
        {:start_rematch, game_params.ref, tournament.current_round_position},
        timeout_ms
      )
    end

    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: wait_type
    })

    tournament
  end

  @impl Tournament.Base
  def finish_round_after_match?(
        %{
          task_provider: "task_pack_per_round",
          round_task_ids: round_task_ids,
          current_round_position: current_round_position
        } = tournament
      ) do
    matches = get_round_matches(tournament, current_round_position)

    task_index = round(2 * Enum.count(matches) / players_count(tournament))

    !Enum.any?(matches, &(&1.state == "playing")) and
      task_index == Enum.count(round_task_ids)
  end

  @impl Tournament.Base
  def set_ranking(t), do: t

  defp get_wait_type(tournament, game_params) do
    # min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

    if has_more_games_in_round?(tournament, game_params) do
      "rematch"
    else
      if finish_tournament?(tournament) do
        "tournament"
      else
        "round"
      end
    end
  end

  defp has_more_games_in_round?(%{task_provider: "task_pack_per_round", round_task_ids: round_task_ids}, game_params) do
    game_params.task_id != List.last(round_task_ids)
  end

  defp has_more_games_in_round?(_tournament, _game_params), do: false
end
