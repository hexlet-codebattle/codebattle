defmodule Codebattle.Tournament.Ranking.ByPlayer do
  @page_size 10

  def get_first(_tournament, _limit \\ @page_size) do
    []
  end

  def get_by_player(_tournament, _player) do
    nil
  end

  def get_nearest_page_by_player(_tournament, _player) do
    []
  end

  def get_page(_tournament, _page) do
    %{
      total_entries: 0,
      page_number: 0,
      page_size: @page_size,
      entries: []
    }
  end

  def set_ranking(tournament) do
    tournament
  end

  def update_player_result(tournament, _player, _score) do
    tournament
  end

  def add_new_player(tournament, _player) do
    tournament
  end
end
