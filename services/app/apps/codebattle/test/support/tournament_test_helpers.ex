defmodule Codebattle.TournamentTestHelpers do
  @moduledoc false
  import Codebattle.Tournament.Helpers

  def win_active_match(tournament, user, params \\ %{opponent_percent: 0}) do
    match =
      tournament
      |> get_matches("playing")
      |> Enum.find(fn m -> user.id in m.player_ids end)

    %{game_id: game_id, player_ids: player_ids} = match

    opponen_id = player_ids |> Enum.reject(&(&1 == user.id)) |> hd()

    check_game(game_id, opponen_id, params.opponent_percent)
    check_game(game_id, user.id, 100)
  end

  def tournament_admin_topic(tournament_id) do
    "tournament:#{tournament_id}"
  end

  def tournament_common_topic(tournament_id) do
    "tournament:#{tournament_id}:common"
  end

  def tournament_translation_topic(tournament_id) do
    "tournament:#{tournament_id}:translation"
  end

  def tournament_player_topic(tournament_id, player_id) do
    "tournament:#{tournament_id}:player:#{player_id}"
  end

  def check_game(_game_id, _user_id, 0), do: :noop

  def check_game(game_id, user_id, percent) do
    params = %{user: %{id: user_id}, editor_text: "solve_percent_#{percent}", editor_lang: "js"}
    Codebattle.Game.Context.check_result(game_id, params)
  end
end
