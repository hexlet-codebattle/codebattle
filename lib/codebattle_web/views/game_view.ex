defmodule CodebattleWeb.GameView do
  use Codebattle.Web, :view
  import Codebattle.GameProcess.FsmHelpers

  def user_name(%Codebattle.User{name: name, rating: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end

  def csrf_token do
    Plug.CSRFProtection.get_csrf_token()
  end
end
