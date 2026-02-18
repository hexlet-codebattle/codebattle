defmodule Codebattle.TournamentTestHelpers do
  @moduledoc false
  import Codebattle.Tournament.Helpers

  def win_active_match(tournament, user, params \\ %{opponent_percent: 0, duration_sec: 30}) do
    match =
      tournament
      |> get_matches("playing")
      |> Enum.find(fn m -> user.id in m.player_ids end)

    %{game_id: game_id, player_ids: player_ids} = match

    opponen_id = player_ids |> Enum.reject(&(&1 == user.id)) |> hd()

    duration_sec = params[:duration_sec] || 30
    check_game(game_id, opponen_id, params.opponent_percent, duration_sec)
    check_game(game_id, user.id, 100, duration_sec)
  end

  def tournament_admin_topic(tournament_id) do
    "tournament:#{tournament_id}"
  end

  def tournament_common_topic(tournament_id) do
    "tournament:#{tournament_id}:common"
  end

  def tournament_player_topic(tournament_id, player_id) do
    "tournament:#{tournament_id}:player:#{player_id}"
  end

  def check_game(_game_id, _user_id, 0, _duration_sec), do: :noop

  def check_game(game_id, user_id, percent, duration_sec) do
    params = %{
      user: %{id: user_id},
      editor_text: "solve_percent_#{percent}",
      editor_lang: "js",
      duration_sec: duration_sec
    }

    Codebattle.Game.Context.check_result(game_id, params)
  end
end
