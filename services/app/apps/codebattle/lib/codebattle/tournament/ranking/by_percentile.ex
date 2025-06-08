defmodule Codebattle.Tournament.Ranking.ByPercentile do
  @moduledoc false
  alias Codebattle.Tournament.Players
  alias Codebattle.Tournament.Storage.Ranking
  alias Codebattle.Tournament.TournamentResult

  @page_size 10

  def get_first(tournament, limit \\ @page_size) do
    Ranking.get_first(tournament, limit)
  end

  def get_event_ranking(_tournament), do: []

  def get_by_player(_tournament, nil), do: nil

  def get_by_player(tournament, player) do
    Ranking.get_by_id(tournament, player.id)
  end

  def get_nearest_page_by_player(tournament, nil) do
    get_page(tournament, 1, @page_size)
  end

  def get_nearest_page_by_player(tournament, player) do
    tournament
    |> Ranking.get_by_id(player.id)
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

  def set_ranking(tournament) do
    ranking = TournamentResult.get_user_ranking(tournament)
    set_places_with_score(tournament, ranking)
    Ranking.put_ranking(tournament, ranking)
    tournament
  end

  def set_ranking_to_ets(tournament) do
    ranking = TournamentResult.get_user_ranking(tournament)
    Ranking.put_ranking(tournament, ranking)
    :ok
  end

  def add_new_player(%{state: state} = tournament, player) when state in ["waiting_participants", "active"] do
    place = Ranking.count(tournament) + 1

    Ranking.put_single_record(tournament, place, %{
      id: player.id,
      place: place,
      score: 0,
      name: player.name,
      clan_id: player.clan_id,
      clan: player.clan
    })

    tournament
  end

  def add_new_player(t, _player), do: t

  def update_player_result(tournament, _player, _score), do: tournament

  def set_places_with_score(tournament, ranking) do
    Enum.each(ranking, fn %{id: id, place: place, score: score} ->
      tournament
      |> Players.get_player(id)
      |> case do
        nil ->
          :noop

        player ->
          Players.put_player(tournament, %{player | place: place, score: score})
      end
    end)
  end
end
