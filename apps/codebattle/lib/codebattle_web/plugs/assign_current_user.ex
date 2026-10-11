defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User
  alias Codebattle.UserSession
  alias CodebattleWeb.Router.Helpers, as: Routes
  alias CodebattleWeb.UserAuth

  require Logger

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    case current_session(conn) do
      {:ok, %UserSession{user: user} = session} ->
        assign_user(conn, user, session)

      :guest ->
        assign_guest(conn)

      :stale ->
        handle_stale_session(conn)
    end
  end

  defp current_session(conn) do
    case UserAuth.session_token(conn) do
      token when is_binary(token) ->
        case UserSession.get_active_by_token(token) do
          nil -> :stale
          session -> {:ok, session}
        end

      _ ->
        if get_session(conn, :user_id), do: :stale, else: :guest
    end
  end

  defp assign_user(conn, %User{subscription_type: :banned}, _session) do
    html = Phoenix.View.render_to_string(CodebattleWeb.LayoutView, "banned.html", conn: conn)

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(403, html)
    |> halt()
  end

  defp assign_user(conn, user, session) do
    conn
    |> assign(:current_user, user)
    |> assign(:current_user_session, session)
  end

  defp assign_guest(conn) do
    {conn, guest_id} = ensure_guest_id(conn)

    conn
    |> assign(:current_user, User.build_guest(guest_id))
    |> assign(:current_user_session, nil)
  end

  defp ensure_guest_id(conn) do
    guest_id = get_session(conn, :guest_id)

    if User.guest_id?(guest_id) and guest_id != User.guest_id() do
      {conn, guest_id}
    else
      guest_id = User.generate_guest_id()
      {put_session(conn, :guest_id, guest_id), guest_id}
    end
  end

  defp handle_stale_session(conn) do
    Logger.info("Clearing invalid or revoked user session for path=#{conn.request_path}")

    conn = clear_session(conn)

    if get_format(conn) == "html" do
      conn
      |> put_flash(:danger, "Your password changed. Please sign in again")
      |> redirect(to: Routes.session_path(conn, :new))
      |> halt()
    else
      assign_guest(conn)
    end
  end
end
