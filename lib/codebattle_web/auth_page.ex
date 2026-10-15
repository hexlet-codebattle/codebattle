defmodule CodebattleWeb.AuthPage do
  @moduledoc """
  The sign in / sign up / password reset page of the new frontend (Inertia page `Auth`).

  `mode` picks the form: `sign_in`, `sign_up`, `reset_password`, or `token_only` (log in
  by link only). The external-OAuth and local-password variants embed admin-provided HTML
  and stay server-rendered (SessionController, bare layout).
  """

  import Inertia.Controller, only: [render_inertia: 3]

  alias CodebattleWeb.Frontend

  @spec render(Plug.Conn.t(), String.t()) :: Plug.Conn.t()
  def render(conn, mode) do
    conn
    |> Frontend.put_layout()
    |> render_inertia("Auth", %{
      "mode" => mode,
      "next" => safe_next(conn.params["next"]),
      "dev_sign_in" => Application.get_env(:codebattle, :dev_sign_in, false) == true
    })
  end

  @doc """
  `next` as a local path ("//host" and "/\\host" are other sites), else "/": never send a
  fresh session off-site.
  """
  @spec safe_next(term()) :: String.t()
  def safe_next("/" <> rest = path) do
    if String.starts_with?(rest, ["/", "\\"]), do: "/", else: path
  end

  def safe_next(_), do: "/"
end
