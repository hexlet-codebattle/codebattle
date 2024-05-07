defmodule Codebattle.Tournament.Ranking.ByClan do
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Storage.Ranking

  @page_size 10

  def get_first(tournament, num \\ @page_size) do
    Ranking.get_first(tournament, num)
  end

  def get_closest_page(tournament, clan_id) do
    tournament
    |> Ranking.get_by_id(clan_id)
    |> case do
      nil -> 0
      %{place: place} -> div(place, @page_size)
    end
    |> then(&get_clans_by_page(tournament, &1))
  end

  def get_clans_by_page(tournament, page) do
    total_entries = Ranking.count(tournament)

    page = min(page, div(total_entries, @page_size))

    %{
      total_entries: total_entries,
      page_number: page,
      page_size: @page_size,
      entries: Ranking.get_slice(tournament, page * @page_size, (page + 1) * @page_size - 1)
    }
  end

  def set_ranking(tournament) do
    tournament
    |> Helpers.get_players()
    |> Enum.group_by(& &1.clan_id)
    |> Enum.map(fn {clan_id, players} ->
      score = players |> Enum.map(& &1.score) |> Enum.sum()
      %{id: clan_id, score: score, place: 0, players_count: Enum.count(players)}
    end)
    |> set_places(tournament)
  end

  def update_player_result(tournament, player) do
    ranking = Ranking.get_all(tournament)

    index = Enum.find_index(ranking, &(&1.id == player.clan_id))

    ranking
    |> List.update_at(
      index,
      &%{&1 | score: &1.score + player.score}
    )
    |> set_places(tournament)
  end

  def add_new_player(tournament, player) do
    ranking = Ranking.get_all(tournament)

    ranking
    |> Enum.find_index(&(&1.id == player.clan_id))
    |> case do
      nil ->
        [
          %{id: player.clan_id, score: 0, place: 0, players_count: 1}
          | ranking
        ]

      index ->
        List.update_at(
          ranking,
          index,
          &%{&1 | players_count: &1.players_count + 1}
        )
    end
    |> set_places(tournament)
  end

  defp set_places(ranking, tournament) do
    ranking
    |> Enum.sort_by(& &1[:score], :desc)
    |> Enum.with_index(1)
    |> Enum.map(fn {clan_rank, place_index} ->
      Map.put(clan_rank, :place, place_index)
    end)
    |> then(&Ranking.put_ranking(tournament, &1))

    tournament
  end
end
