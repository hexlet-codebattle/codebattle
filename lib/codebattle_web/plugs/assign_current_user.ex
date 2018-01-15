defmodule CodebattleWeb.Plugs.AssignCurrentUser do
  import Plug.Conn

  alias Codebattle.User

  @spec init(Keyword.t) :: Keyword.t
  def init(opts), do: opts

  @spec call(Plug.Conn.t, Keyword.t) :: Plug.Conn.t
  def call(conn, _opts) do
    #TODO: maybe store all user data in session
    user_id = get_session(conn, :user_id)
    user = case user_id do
      nil -> %User{guest: true}
      id ->
        Codebattle.User |> Codebattle.Repo.get(id)
    end

    conn |> assign(:current_user, user)
  end
end
