defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User
  alias CodebattleWeb.Router.Helpers, as: Routes

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)

    case {user_id, conn.request_path} do
      # for all guests we allow to login via token or via password
      {nil, path}
      when path in [
             "/session",
             "/session/",
             "/session/new",
             "/session/new/",
             "/auth/token/",
             "/auth/token"
           ] ->
        assign(conn, :current_user, User.build_guest())

      {nil, _path} ->
        handle_guest(conn)

      {id, _path} ->
        case User.get(id) do
          nil ->
            conn
            |> clear_session()
            |> put_flash(:danger, "You must be logged in to access that page")
            |> redirect(to: Routes.session_path(conn, :new))
            |> halt()

          user ->
            assign(conn, :current_user, user)
        end
    end
  end

  defp handle_guest(conn) do
    if FunWithFlags.enabled?(:restrict_guests_access) do
      url = Application.get_env(:codebattle, :guest_user_force_redirect_url)
      # redirect to login page if there is now custom guest_auth_url
      if url in [nil, ""] do
        conn
        |> redirect(to: Routes.session_path(conn, :new))
        |> halt()
      else
        conn
        |> redirect(external: url)
        |> halt()
      end
    else
      assign(conn, :current_user, User.build_guest())
    end
  end
end
