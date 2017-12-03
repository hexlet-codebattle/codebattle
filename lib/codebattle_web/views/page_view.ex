defmodule CodebattleWeb.PageView do
  use Codebattle.Web, :view

  def get_users(fsm) do
    [fsm.data[:first_player], fsm.data[:second_player]]
    |> Enum.filter(fn x -> x end)
  end

  def can_check?(fsm, user) do
    users = get_users(fsm)
    data = fsm.data
    if Enum.member?(users, user) do
      !Enum.member?([data.winner, data.loser], user)
    else
      false
    end
  end

  def user_name(user) do
    "#{user.name}(#{user.raiting})"
  end
end
