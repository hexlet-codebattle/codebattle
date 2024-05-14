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
    ~r{^\/settings\/?$},
    ~r{^\/user\/current\/?$},
    ~r{^\/api\/v1\/settings\/?$},
    ~r{^\/api\/v1\/events\/.+$},
    ~r{^\/api\/v1\/playbook\/\d+\/?$}
  ]

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    if User.admin?(conn.assigns.current_user) do
      conn
    else
      url = Application.get_env(:codebattle, :force_redirect_url)

      if url == nil || url == "" ||
           Enum.any?(@allowed_paths, &Regex.match?(&1, conn.request_path)) do
        conn
      else
        conn
        |> redirect(to: url)
        |> halt()
      end
    end
  end
end
