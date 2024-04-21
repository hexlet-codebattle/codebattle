defmodule Codebattle.TournamentTestHelpers do
  import Codebattle.Tournament.Helpers

  def send_user_win_match(tournament, user) do
    user_id = user.id

    [last_user_match] =
      tournament
      |> get_matches("playing")
      |> Enum.filter(&(user_id in &1.player_ids))

    %{game_id: game_id} = last_user_match
    # TODO: finish actual game
    params = %{user: %{id: user_id}, editor_text: "", editor_lang: "js"}
    Codebattle.Game.Context.check_result(game_id, params)
  end
end
