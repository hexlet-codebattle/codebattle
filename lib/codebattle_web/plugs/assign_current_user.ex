defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  import Plug.Conn

  alias Codebattle.User

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)
    case user_id do
      nil ->
        conn |> assign(:current_user, %User{guest: true})
      id ->
        case Codebattle.Repo.get(User, id) do
          nil ->
            conn
            |> clear_session()
            |> assign(:current_user, %User{guest: true})
          user -> user
            conn |> assign(:current_user, user)
        end
    end
  end
end
