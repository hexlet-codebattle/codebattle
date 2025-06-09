defmodule Codebattle.Tournament.Ranking.Void do
  @moduledoc false
  def get_first(_tournament, _limit \\ 0) do
    []
  end

  def get_by_player(_tournament, _player) do
    nil
  end

  def get_nearest_page_by_player(_tournament, _player) do
    %{
      total_entries: 0,
      page_number: 0,
      page_size: 0,
      entries: []
    }
  end

  def get_page(_tournament, _page, _page_size) do
    %{
      total_entries: 0,
      page_number: 0,
      page_size: 0,
      entries: []
    }
  end

  def set_ranking(tournament) do
    tournament
  end

  def get_event_ranking(_tournament) do
    []
  end

  def set_ranking_to_ets(tournament) do
    tournament
  end

  def update_player_result(tournament, _player, _score) do
    tournament
  end

  def add_new_player(tournament, _player) do
    tournament
  end
end
