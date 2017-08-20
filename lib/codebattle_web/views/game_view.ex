defmodule CodebattleWeb.GameView do
  use Codebattle.Web, :view

  def get_users(fsm) do
    [fsm.data[:first_player], fsm.data[:second_player]]
    |> Enum.filter(fn x -> x end)
  end

  def user_name(user) do
    "#{user.name}(#{user.raiting})"
  end
end
