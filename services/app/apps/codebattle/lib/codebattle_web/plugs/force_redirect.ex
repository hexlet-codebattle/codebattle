defmodule CodebattleWeb.Plugs.ForceRedirect do
  import Plug.Conn
  import Phoenix.Controller

  alias Codebattle.User

  @allowed_paths [
    ~r{^\/$},
    ~r{^\/e\/\S+\/?$},
    ~r{^\/tournaments\/\d+\/?$},
    ~r{^\/games\/\d+\/?$},
    ~r{^\/api\/v1\/user\/\d+\/stats\/?$},
    ~r{^\/auth\/token\/?$},
    # ~r{^\/settings\/?$},
    ~r{^\/user\/current\/?$},
    # ~r{^\/api\/v1\/settings\/?$},
    ~r{^\/api\/v1\/events\/.+$},
    ~r{^\/api\/v1\/playbook\/\d+\/?$}
  ]

  @allowed_banned_paths [
    ~r{^\/$},
    ~r{^\/e\/\S+\/?$},
    ~r{^\/api\/v1\/events\/.+$},
    ~r{^\/auth\/token\/?$}
  ]

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    url = Application.get_env(:codebattle, :force_redirect_url)

    cond do
      User.admin?(conn.assigns.current_user) ->
        conn

      conn.assigns.current_user.subscription_type == :banned and
          !Enum.any?(@allowed_banned_paths, &Regex.match?(&1, conn.request_path)) ->
        conn
        |> redirect(to: "/")
        |> halt()

      url == nil || url == "" ->
        conn

      Enum.any?(@allowed_paths, &Regex.match?(&1, conn.request_path)) ->
        conn

      true ->
        conn
        |> redirect(to: url)
        |> halt()
    end
  end
end
