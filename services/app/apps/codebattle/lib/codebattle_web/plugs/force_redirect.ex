defmodule CodebattleWeb.Plugs.ForceRedirect do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User

  @allowed_paths [
    # ~r{^\/$},
    # ~r{^\/e\/\S+\/?$},
    ~r{^\/tournaments\/\d+\/?$},
    ~r{^\/games\/\d+\/?$},
    ~r{^\/games\/\training\/?$},
    ~r{^\/api\/v1\/user\/\d+\/stats\/?$},
    ~r{^\/auth\/token\/?$},
    ~r{^\/maintenance\/?$},
    ~r{^\/session\/new\/?$},
    ~r{^\/session\/?$},
    # ~r{^\/settings\/?$},
    ~r{^\/user\/current\/?$},
    # ~r{^\/api\/v1\/settings\/?$},
    ~r{^\/api\/v1\/events\/.+$},
    ~r{^\/api\/v1\/playbook\/\d+\/?$}
  ]

  # @allowed_banned_paths [
  #   ~r{^\/$},
  #   ~r{^\/e\/\S+\/?$},
  #   ~r{^\/maintenance\/?$},
  #   ~r{^\/api\/v1\/events\/.+$},
  #   ~r{^\/auth\/token\/?$}
  # ]

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    url = Application.get_env(:codebattle, :force_redirect_url)

    cond do
      User.admin?(conn.assigns.current_user) ->
        conn

      conn.assigns.current_user.subscription_type == :banned ->
        conn
        |> redirect(to: "/maintenance")
        |> halt()

      url in ["", nil] ->
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
