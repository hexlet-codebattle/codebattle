# credo:disable-for-this-file Credo.Check.Refactor.CyclomaticComplexity
defmodule CodebattleWeb.Plugs.RescrictAccess do
  @moduledoc false
  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User
  alias CodebattleWeb.Router.Helpers, as: Routes

  @allowed_test_game_paths [
    ~r{^\/games\/\d+\/?$},
    ~r{^\/games\/training\/?$}
  ]

  @allowed_session_paths [
    ~r{^\/session\/new\/?$},
    ~r{^\/session\/?$},
    ~r{^\/session\/external\/signup\/?$},
    ~r{^\/auth\/token\/?$},
    ~r{^\/auth\/(?:github|discord|external)\/?$},
    ~r{^\/auth\/(?:github|discord|external)\/callback\/?$}
  ]

  @allowed_mini_paths [
    ~r{^\/$},
    ~r{^\/tournaments\/\d+\/?$},
    ~r{^\/e\/\w+\/?$},
    ~r{^\/e\/\w+\/stage\/?$},
    ~r{^\/games\/\d+\/?$},
    ~r{^\/api\/v1\/user\/\d+\/stats\/?$},
    # ~r{^\/settings\/?$},
    ~r{^\/user\/current\/?$},
    # ~r{^\/api\/v1\/settings\/?$},
    # ~r{^\/api\/v1\/events\/.+$},
    ~r{^\/api\/v1\/playbook\/\d+\/?$}
  ]

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    current_user = conn.assigns.current_user

    cond do
      # allow admins to access any page
      User.admin?(current_user) ->
        conn

      # allow guests to access test games if enabled feature flag
      current_user.is_guest && FunWithFlags.enabled?(:allow_test_game) &&
          Enum.any?(@allowed_test_game_paths, &Regex.match?(&1, conn.request_path)) ->
        conn

      # allow guests to access session new path
      current_user.is_guest &&
          Enum.any?(@allowed_session_paths, &Regex.match?(&1, conn.request_path)) ->
        conn

      # redirect to login page if we restrict guests access
      current_user.is_guest && FunWithFlags.enabled?(:restrict_guests_access) ->
        conn
        |> redirect(to: Routes.session_path(conn, :new))
        |> halt()

      # redirect to custom url if we restrict don't allow free users to access the site

      current_user.subscription_type == :free &&
        FunWithFlags.enabled?(:redirect_free_users) &&
        !Enum.any?(
          @allowed_session_paths,
          &Regex.match?(&1, conn.request_path)
        ) &&
          FunWithFlags.enabled?(:use_only_external_oauth) ->
        conn
        |> redirect(to: "/session/external/signup")
        |> halt()

      # redirect to root if we use mini version of codebattle
      FunWithFlags.enabled?(:codebattle_mini_version) &&
          !Enum.any?(
            @allowed_mini_paths ++ @allowed_session_paths,
            &Regex.match?(&1, conn.request_path)
          ) ->
        conn
        |> redirect(to: "/")
        |> halt()

      # allow access to the page by default
      true ->
        conn
    end
  end
end
