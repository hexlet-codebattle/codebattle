defmodule CodebattleWeb.GameView do
  use CodebattleWeb, :view
  import Codebattle.GameProcess.FsmHelpers

  def user_name(%Codebattle.User{name: name, rating: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end

  def player_name(%Codebattle.GameProcess.Player{user_name: user_name, user_rating: user_rating}) do
    case {user_name, user_rating} do
      {nil, nil} -> ""
      _ -> "#{user_name}(#{user_rating})"
    end
  end

  def game_result(%Codebattle.Game{users: users, user_games: user_games}) do
    users
    |> Enum.map(fn u ->
      "#{user_name(u)} #{Enum.find(user_games, fn ug -> ug.user_id == u.id end).result}"
    end)
    |> Enum.join(", ")
  end

  def csrf_token do
    Plug.CSRFProtection.get_csrf_token()
  end
end
