defmodule CodebattleWeb.Plugs.TokenAuth do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  def init(options), do: options

  def call(conn, _) do
    key = Application.get_env(:codebattle, :api_key)

    if key && key == List.first(get_req_header(conn, "x-auth-key")) do
      conn
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "oiblz"})
      |> halt()
    end
  end
end
