defmodule CodebattleWeb.Plugs.AssignGon do
  @moduledoc false

  import PhoenixGon.Controller
  alias Codebattle.User

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    current_user = conn.assigns[:current_user]

    user_token =
      case current_user.guest do
        true -> Phoenix.Token.sign(conn, "user_token", "anonymous")
        _ -> Phoenix.Token.sign(conn, "user_token", current_user.id)
      end

    put_gon(conn,
      user_token: user_token,
      current_user: prepare_user(current_user)
    )
  end

  defp prepare_user(user) do
    Map.take(user, [
      :id,
      :name,
      :github_name,
      :rating,
      :is_bot,
      :guest,
      :github_id,
      :lang,
      :editor_mode,
      :editor_theme,
      :achievements,
      :rank,
      :games_played,
      :performance,
      :inserted_at,
      :sound_settings
    ])
  end
end
