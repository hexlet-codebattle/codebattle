defmodule CodebattleWeb.PageView do
  use Codebattle.Web, :view

  alias Codebattle.GameProcess.FsmHelpers

  def get_users(fsm) do
    FsmHelpers.get_users(fsm)
  end

  def can_check?(fsm, user) do
    FsmHelpers.is_player?(fsm.data, user.id)
  end

  def csrf_token() do
    Plug.CSRFProtection.get_csrf_token()
  end

  # TODO: fix typo in "raiting"
  def user_name(%Codebattle.User{name: name, raiting: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end
end
