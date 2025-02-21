defmodule CodebattleWeb.GameView do
  use CodebattleWeb, :view

  import Codebattle.Game.Helpers

  def user_name(%Codebattle.User{name: name, rating: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end

  def player_name(%Codebattle.Game.Player{name: name, rating: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end

  def result(%Codebattle.Game{users: users, user_games: user_games}) do
    Enum.map_join(users, ", ", fn u ->
      "#{user_name(u)} #{Enum.find(user_games, fn ug -> ug.user_id == u.id end).result}"
    end)
  end

  def load_jitsi?(user, player1, player2) do
    Codebattle.User.admin?(user) || player1.id == user.id || player2.id == user.id
  end

  def csrf_token do
    Plug.CSRFProtection.get_csrf_token()
  end
end
