defmodule CodebattleWeb.GameView do
  use Codebattle.Web, :view

  def get_users(game) do
    [game.data.first_player, game.data.second_player]
    |> Enum.filter(fn x -> x end)
  end
end
