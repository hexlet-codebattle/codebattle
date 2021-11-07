defmodule CodebattleWeb.Game.CreateGame do
  def call(user, params) do
    type =
      case params["type"] do
        "withFriend" -> "private"
        "withRandomPlayer" -> "public"
        type -> type
      end

    level =
      case params["type"] do
        "training" -> "elementary"
        _ -> params["level"]
      end

    user = conn.assigns.current_user

    game_params = %{
      level: level,
      type: type,
      timeout_seconds: params["timeout_seconds"],
      user: user
    }
  end
end
