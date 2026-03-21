defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User
  alias CodebattleWeb.Router.Helpers, as: Routes

  require Logger

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)

    case user_id do
      nil ->
        assign(conn, :current_user, User.build_guest())

      id ->
        case User.get(id) do
          nil ->
            handle_missing_user(conn)

          %User{subscription_type: :banned} ->
            html = Phoenix.View.render_to_string(CodebattleWeb.LayoutView, "banned.html", conn: conn)

            conn
            |> put_resp_content_type("text/html")
            |> send_resp(403, html)
            |> halt()

          user ->
            assign(conn, :current_user, user)
        end
    end
  end

  defp handle_missing_user(conn) do
    Logger.warning(
      "Clearing invalid session: user_id=#{inspect(get_session(conn, :user_id))} path=#{conn.request_path}"
    )

    conn = clear_session(conn)

    if get_format(conn) == "html" do
      conn
      |> put_flash(:danger, "You must be logged in to access that page")
      |> redirect(to: Routes.session_path(conn, :new))
      |> halt()
    else
      assign(conn, :current_user, User.build_guest())
    end
  end
end
