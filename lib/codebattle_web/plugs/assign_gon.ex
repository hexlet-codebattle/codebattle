defmodule CodebattleWeb.Plugs.AssignGon do
  @moduledoc false

  import PhoenixGon.Controller
  import Plug.Conn
  require Logger

  @spec init(Keyword.t) :: Keyword.t
  def init(opts), do: opts

  @spec call(Plug.Conn.t, Keyword.t) :: Plug.Conn.t
  def call(conn, _opts) do
    current_user = conn.assigns[:current_user]

    case current_user.guest do
      true ->
        conn
      _ ->
        user_token = Phoenix.Token.sign(conn, "user_token", current_user.id)
        params = %{user_token: user_token, current_user: current_user}
        Logger.debug inspect ["Params For Gon", params]
        conn
        |> put_gon(params)
    end
  end
end
