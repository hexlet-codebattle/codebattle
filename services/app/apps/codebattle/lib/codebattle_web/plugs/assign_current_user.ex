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

  @allowed_paths [
    ~r{^\/games\/\d+\/?$},
    ~r{^\/games\/training\/?$}
  ]
  defp handle_guest(conn) do
    restrict_guests_access? = FunWithFlags.enabled?(:restrict_guests_access)
    allow_test_game? = FunWithFlags.enabled?(:allow_test_game)
    url = Application.get_env(:codebattle, :guest_user_force_redirect_url)

    cond do
      restrict_guests_access? && allow_test_game? && Enum.any?(@allowed_paths, &Regex.match?(&1, conn.request_path)) ->
        assign(conn, :current_user, User.build_guest())

      # redirect to login page if there is now custom guest_auth_url
      restrict_guests_access? && url in [nil, ""] ->
        conn
        |> redirect(to: Routes.session_path(conn, :new))
        |> halt()

      restrict_guests_access? ->
        conn
        |> redirect(external: url)
        |> halt()

      :default ->
        assign(conn, :current_user, User.build_guest())
    end
  end
end
