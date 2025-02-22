defmodule Codebattle.Tournament.Arena do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def finish_round_after_match?(_tournament), do: false

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    {player_pair_ids, unmatched_player_ids} = build_player_pairs(tournament)

    played_pair_ids = MapSet.new(player_pair_ids, &Enum.sort/1)

    opponent_bot = Tournament.Player.new!(Bot.Context.build())

    unmatched =
      Enum.map(unmatched_player_ids, fn id ->
        [get_player(tournament, id), opponent_bot]
      end)

    {
      update_struct(tournament, %{played_pair_ids: played_pair_ids}),
      player_pair_ids
      |> Enum.map(&get_players(tournament, &1))
      |> Enum.concat(unmatched)
    }
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def set_ranking(tournament) do
    Tournament.Ranking.set_ranking(tournament)
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    players =
      tournament
      |> get_players(Map.keys(game_params.player_results))
      |> Enum.reject(&(&1.is_bot || &1.state == "banned"))

    Enum.each(
      players,
      fn player ->
        cond do
          player.state == "active" && player_finished_round?(tournament, player) ->
            new_player = %{player | state: "finished_round"}

            Codebattle.PubSub.broadcast("tournament:player:finished_round", %{
              tournament: tournament,
              player: new_player
            })

            Tournament.Players.put_player(tournament, new_player)

          player.state == "active" ->
            new_player = %{
              player
              | state: "matchmaking_active",
                wr_joined_at: :os.system_time(:second)
            }

            Tournament.Players.put_player(tournament, new_player)

            Codebattle.PubSub.broadcast("tournament:player:matchmaking_started", %{
              tournament: tournament,
              player: new_player
            })

          true ->
            :noop
        end
      end
    )

    tournament
  end

  defp build_player_pairs(%{use_clan: true, current_round_position: 0} = tournament) do
    tournament
    |> get_players()
    |> Enum.map(&{&1.id, &1.clan_id})
    |> Tournament.PairBuilder.ByClan.call()
  end

  defp build_player_pairs(%{use_clan: true} = tournament) do
    tournament
    |> get_players()
    |> Enum.map(&{&1.id, &1.clan_id, &1.score})
    |> Tournament.PairBuilder.ByClanAndScore.call()
  end

  defp build_player_pairs(tournament) do
    tournament
    |> get_players()
    |> Enum.map(&{&1.id, &1.score})
    |> Tournament.PairBuilder.ByScore.call()
  end
end
