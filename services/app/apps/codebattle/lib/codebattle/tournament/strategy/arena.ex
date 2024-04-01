defmodule Codebattle.Tournament.Arena do
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def calculate_round_results(tournament) do
    # TODO: improve  index with same score should be the same
    # now we just use random

    sorted_players_with_index =
      tournament
      |> get_players()
      |> Enum.sort_by(& &1.score, :desc)

    sorted_players_with_index
    |> Enum.with_index()
    |> Enum.each(fn {player, index} ->
      Tournament.Players.put_player(tournament, %{player | place: index})
    end)

    top_player_ids =
      sorted_players_with_index
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
end
