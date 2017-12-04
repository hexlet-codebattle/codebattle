defmodule CodebattleWeb.PageView do
  use Codebattle.Web, :view

  def get_users(fsm) do
    [fsm.data[:first_player], fsm.data[:second_player]]
    |> Enum.filter(fn x -> x.id end)
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

  # FIX: typo in "raiting"
  def user_name(%Codebattle.User{:name => name, :raiting => rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end
end
