defmodule CodebattleWeb.Plugs.MaintenanceMode do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    cond do
      User.admin?(conn.assigns.current_user) ->
        conn

      FunWithFlags.enabled?(:maintenance_mode) ->
        conn
        |> put_status(:service_unavailable)
        |> put_layout(html: {CodebattleWeb.LayoutView, :landing})
        |> put_view(CodebattleWeb.RootView)
        |> render("maintenance.html")
        |> halt()

      true ->
        conn
    end
  end
end
