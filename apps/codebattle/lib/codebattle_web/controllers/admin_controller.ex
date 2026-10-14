defmodule CodebattleWeb.AdminController do
  use CodebattleWeb, :controller

  def connections(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Codebattle Admin Connections",
      description: "Live monitor of user socket connections"
    })
    |> CodebattleWeb.Frontend.put_layout()
    |> render_inertia("AdminConnections", %{})
  end
end
