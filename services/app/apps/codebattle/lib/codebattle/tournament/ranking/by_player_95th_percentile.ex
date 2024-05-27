defmodule Codebattle.Tournament.Ranking.ByPlayer95thPercentile do
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.Storage.Ranking
  alias Codebattle.Tournament.Players

  @page_size 10

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

  def get_page(tournament, page) do
    total_entries = Ranking.count(tournament)

    start_index = (page - 1) * @page_size + 1
    end_index = start_index + @page_size - 1

    %{
      total_entries: total_entries,
      page_number: page,
      page_size: @page_size,
      entries: Ranking.get_slice(tournament, start_index, end_index)
    }
  end

  def add_new_player(tournament, _player), do: tournament
  def update_player_result(tournament, _player, _score), do: tournament

  def set_places_with_score(tournament, ranking) do
    Enum.each(ranking, fn %{id: id, place: place, score: score} ->
      tournament
      |> Players.get_player(id)
      |> then(&Players.put_player(tournament, %{&1 | place: place, score: score}))
    end)
  end
end
