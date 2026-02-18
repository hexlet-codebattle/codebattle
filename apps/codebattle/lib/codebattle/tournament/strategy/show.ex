defmodule Codebattle.Tournament.Show do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    bot = Bot.Context.build()
    add_player(tournament, bot)
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "solo"

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    player_pairs =
      tournament
      |> get_players()
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament), do: final_round?(tournament)

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
    wait_type = get_wait_type(tournament, timeout_ms)

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
  def finish_round_after_match?(_tournament), do: true

  # defp final_round?(
  #   tournament = %{
  #     task_provider: "task_pack",
  #     round_task_ids: round_task_ids,
  #   }
  # ) do
  #   player =
  #     tournament
  #     |> get_players()
  #     |> List.first()
  #
  #   Enum.count(player.task_ids) == Enum.count(round_task_ids)
  # end

  defp final_round?(%{task_provider: "task_pack", task_ids: task_ids, current_round_position: current_round_position}) do
    current_round_position === Enum.count(task_ids) - 1
  end

  defp final_round?(_t), do: false

  defp get_wait_type(tournament, _timeout_ms) do
    # min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

    if final_round?(tournament) do
      if finish_tournament?(tournament) do
        "tournament"
      else
        "round"
      end
    else
      "rematch"
    end
  end

  # Code from base module, only for show tournament
  # next time use it here instead of base
  # |> maybe_add_award(tournament)
  # |> maybe_add_locked(tournament)

  # defp maybe_add_locked(game_params, tournament) do
  #   tournament.meta
  #   |> Map.get(:game_passwords)
  #   |> case do
  #     nil -> Map.put(game_params, :locked, false)
  #     passwords -> Map.put(game_params, :locked, true)
  #   end
  # end
  # def create_match(tournament, params) do
  #   %{user_id: user_id, level: level} = params
  #   new_match_id = matches_count(tournament)
  #   players = get_players(tournament, [user_id])

  #   case create_game(tournament, players, new_match_id, %{level: level}) do
  #     nil ->
  #       # TODO: send message that there is no tasks in task_pack
  #       nil

  #     game ->
  #       build_and_run_match(tournament, players, game, false)
  #   end

  #   tournament
  # end
end
