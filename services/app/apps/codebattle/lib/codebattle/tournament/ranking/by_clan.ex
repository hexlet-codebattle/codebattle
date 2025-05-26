defmodule Codebattle.Tournament.Ranking.ByClan do
  @moduledoc false
  alias Codebattle.Event.EventClanResult
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Storage.Ranking

  @page_size 10

  def get_first(tournament, limit \\ @page_size) do
    Ranking.get_first(tournament, limit)
  end

  def get_by_player(tournament, player) do
    Ranking.get_by_id(tournament, get_clan_id(player))
  end

  def get_nearest_page_by_player(tournament, nil) do
    get_page(tournament, 1, @page_size)
  end

  def get_nearest_page_by_player(tournament, player) do
    tournament
    |> Ranking.get_by_id(get_clan_id(player))
    |> case do
      nil -> 0
      %{place: place} -> div(place, @page_size) + 1
    end
    |> then(&get_page(tournament, &1, @page_size))
  end

  def get_page(tournament, page, page_size) do
    total_entries = Ranking.count(tournament)

    start_index = (page - 1) * page_size + 1
    end_index = start_index + page_size - 1

    %{
      total_entries: total_entries,
      page_number: page,
      page_size: page_size,
      entries: Ranking.get_slice(tournament, start_index, end_index)
    }
  end

  def get_event_ranking(tournament) do
    tournament.event_id
    |> EventClanResult.get_by_event_id()
    |> Enum.map(fn item ->
      %{id: item.clan_id, score: item.score, place: item.place, players_count: 0}
    end)
  end

  def set_ranking(tournament) do
    event_ranking = tournament.event_ranking

    tournament
    |> Helpers.get_players()
    |> Enum.reject(& &1.is_bot)
    |> Enum.group_by(&get_clan_id(&1))
    |> Enum.map(fn {clan_id, players} ->
      score = players |> Enum.map(& &1.score) |> Enum.sum()
      event_score = get_in(event_ranking, [clan_id, :score]) || 0
      %{id: clan_id, score: event_score + score, place: 0, players_count: Enum.count(players)}
    end)
    |> set_places(tournament)
  end

  def set_ranking_to_ets(_tournament), do: :ok

  def update_player_result(tournament, player, score) do
    ranking = Ranking.get_all(tournament)

    index = Enum.find_index(ranking, &(&1.id == get_clan_id(player)))

    ranking
    |> List.update_at(
      index,
      &%{&1 | score: &1.score + score}
    )
    |> set_places(tournament)
  end

  def add_new_player(tournament, player) do
    ranking = Ranking.get_all(tournament)

    ranking
    |> Enum.find_index(&(&1.id == get_clan_id(player)))
    |> case do
      nil ->
        [
          %{id: get_clan_id(player), score: 0, place: 0, players_count: 1}
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
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(&{&1[:score], &1[:players_count]}, :desc)
    |> Enum.with_index(1)
    |> Enum.map(fn {clan_rank, place_index} ->
      Map.put(clan_rank, :place, place_index)
    end)
    |> then(&Ranking.put_ranking(tournament, &1))

    tournament
  end

  defp get_clan_id(nil), do: -1
  defp get_clan_id(%{clan_id: nil}), do: -1
  defp get_clan_id(%{clan_id: clan_id}), do: clan_id
end
