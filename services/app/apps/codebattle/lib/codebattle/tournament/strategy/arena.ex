defmodule Codebattle.Tournament.Arena do
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def finish_round?(_tournament), do: false

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    TournamentResult.upsert_results(tournament)
    get_player_results = TournamentResult.get_player_results(tournament)

    get_player_results
    |> Enum.each(fn %{score: score, place: place, player_id: player_id} ->
      Tournament.Players.put_player(tournament, %{
        Tournament.Players.get_player(tournament, player_id)
        | place: place,
          score: score
      })
    end)

    top_player_ids =
      tournament
      |> Tournament.Players.get_players()
      |> Enum.sort_by(& &1.score)
      |> Enum.take(30)
      |> Enum.map(& &1.id)

    %{tournament | top_player_ids: top_player_ids}
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    {player_pair_ids, unmatched_player_ids} = build_player_pairs(tournament)

    played_pair_ids =
      player_pair_ids
      |> Enum.map(&Enum.sort/1)
      |> MapSet.new()

    opponent_bot = Bot.Context.build() |> Tournament.Player.new!()

    unmatched =
      unmatched_player_ids
      |> Enum.map(fn id ->
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
  def maybe_create_rematch(tournament, game_params) do
    players =
      tournament
      |> get_players(Map.keys(game_params.player_results))
      |> Enum.reject(&(&1.is_bot || &1.state == "banned"))

    Enum.each(
      players,
      fn player ->
        new_player =
          if player_finished_round?(tournament, player) do
            %{player | state: "finished_round"}
          else
            new_player = %{player | state: "in_waiting_room_active"}
            WaitingRoom.put_player(tournament.waiting_room_name, new_player)
            new_player
          end

        Tournament.Players.put_player(tournament, new_player)
        broadcast_player_updated(tournament, new_player)
      end
    )

    tournament
  end

  defp build_player_pairs(tournament = %{meta: %{use_clan: true}, current_round_position: 0}) do
    tournament
    |> get_players()
    |> Enum.map(&{&1.id, &1.clan_id})
    |> Tournament.PairBuilder.ByClan.call()
  end

  defp build_player_pairs(tournament = %{meta: %{use_clan: true}}) do
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

  defp player_finished_round?(tournament, player) do
    Enum.count(player.task_ids) == Enum.count(tournament.round_task_ids)
  end

  defp broadcast_player_updated(tournament, player) do
    Codebattle.PubSub.broadcast("tournament:player:updated", %{
      tournament: tournament,
      player: player
    })
  end
end
