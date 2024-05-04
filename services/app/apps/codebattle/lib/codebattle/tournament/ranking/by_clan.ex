defmodule Codebattle.Tournament.Ranking.ByClan do
  alias Codebattle.Tournament.Helpers

  @page_size 10

  def get_first_clans(tournament, num \\ @page_size) do
    Enum.take(tournament.ranking, num)
  end

  def get_near_clans(tournament, clan_id) do
    tournament.ranking
    |> Enum.find_index(clan_id)
    |> div(@page_size)
    |> then(&get_clans_by_page(tournament, &1))
  end

  def get_clans_by_page(tournament, page) do
    total_entries = Enum.count(tournament.ranking)

    page = min(page, div(total_entries, @page_size))

    %{
      total_entries: total_entries,
      page_number: page,
      page_size: @page_size,
      entries: Enum.slice(tournament.ranking, page * @page_size, (page + 1) * @page_size - 1)
    }
  end

  def set_all(tournament) do
    tournament
    |> Helpers.get_players()
    |> Enum.group_by(& &1.clan_id)
    |> Enum.map(fn {clan_id, players} ->
      score = players |> Enum.map(& &1.score) |> Enum.sum()
      %{clan_id: clan_id, score: score, place: 0, players_count: Enum.count(players)}
    end)
    |> set_places(tournament)
  end

  def update_player_result(tournament, player) do
    index = Enum.find_index(tournament.ranking, &(&1.clan_id == player.clan_id))

    List.update_at(
      tournament.ranking,
      index,
      &%{&1 | score: &1.score + player.score}
    )
    |> set_places(tournament)
  end

  def add_new_player(tournament, player) do
    case Enum.find_index(tournament.ranking, player.clan_id) do
      nil ->
        [
          %{clan_id: player.clan_id, score: 0, place: 0, players_count: 1}
          | tournament.ranking
        ]

      index ->
        List.update_at(
          tournament.ranking,
          index,
          &%{&1 | players_count: &1.players_count + 1}
        )
    end
    |> set_places(tournament)
  end

  def set_places(ranking, tournament) do
    ranking
    |> Enum.group_by(& &1.score)
    |> Map.to_list()
    |> Enum.sort_by(&elem(&1, 0), &>=/2)
    |> Enum.with_index(1)
    |> Enum.flat_map(fn {clans, index} ->
      Enum.map(clans, fn ranking -> Map.put(ranking, :place, index) end)
    end)
    |> then(&Map.put(tournament, :ranking, &1))
  end
end
