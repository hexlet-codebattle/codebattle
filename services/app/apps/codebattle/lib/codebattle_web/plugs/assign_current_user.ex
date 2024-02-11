defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  import Plug.Conn
  import Phoenix.Controller

  alias Codebattle.User
  alias CodebattleWeb.Router.Helpers, as: Routes

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)

    case {user_id, conn.request_path} do
      {nil, path} when path in ["/auth/token/", "/auth/token"] ->
        conn |> assign(:current_user, User.build_guest())

      {nil, _path} ->
        if Application.get_env(:codebattle, :allow_guests) do
          conn |> assign(:current_user, User.build_guest())
        else
          conn
          |> put_flash(:danger, "You must be logged in to access that page")
          |> redirect(to: Routes.session_path(conn, :new))
          |> halt()
        end

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
end
