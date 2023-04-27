defmodule CodebattleWeb do
  @moduledoc """
  A module that keeps using definitions for controllers,
  views and so on.

  This can be used in your application as:

      use CodebattleWeb, :controller
      use CodebattleWeb, :view

  The definitions below will be executed for every view,
  controller, etc, so keep them short and clean, focused
  on imports, uses and aliases.

  Do NOT define functions inside the quoted expressions
  below.
  """

  def model do
    quote do
      use Ecto.Schema

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
    end
  end

  def controller do
    quote do
      use Phoenix.Controller, namespace: CodebattleWeb
      use PhoenixMetaTags.TagController

      alias Codebattle.Repo
      alias CodebattleWeb.Router.Helpers, as: Routes

      import Ecto
      import Ecto.Query
      import CodebattleWeb.Gettext
      import Phoenix.LiveView.Controller, only: [live_render: 3]
    end
  end

  def view do
    quote do
      use Phoenix.View,
        root: "lib/codebattle_web/templates",
        namespace: CodebattleWeb

      use PhoenixMetaTags.TagView

      alias CodebattleWeb.Router.Helpers, as: Routes

      # Import convenience functions from controllers
      import Phoenix.Controller, only: [view_module: 1]

      # Use all HTML functionality (forms, tags, etc)
      use Phoenix.HTML
      import Phoenix.HTML.Form

      import CodebattleWeb.ErrorHelpers
      import CodebattleWeb.Gettext
      import CodebattleWeb.FormHelpers

      unquote(view_helpers())
    end
  end

  def live_view do
    quote do
      use Phoenix.LiveView,
        root: "lib/codebattle_web/templates",
        namespace: CodebattleWeb

      use PhoenixMetaTags.TagView

      # Import convenience functions from controllers
      import Phoenix.Controller, only: [view_module: 1]

      # Use all HTML functionality (forms, tags, etc)
      use Phoenix.HTML
      import Phoenix.HTML.{Form, Tag, Link, Format}

      import CodebattleWeb.ErrorHelpers
      import CodebattleWeb.Gettext

      unquote(view_helpers())
    end
  end

  def component do
    quote do
      use Phoenix.Component

      unquote(view_helpers())
    end
  end

  def live_component do
    quote do
      use Phoenix.LiveComponent

      unquote(view_helpers())
    end
  end

  defp view_helpers do
    quote do
      use Phoenix.HTML

      alias CodebattleWeb.Router.Helpers, as: Routes
      alias Phoenix.LiveView.JS
      # Import basic rendering functionality (render, render_layout, etc)
      # import Phoenix.View
    end
  end

  def router do
    quote do
      use Phoenix.Router
      import Plug.Conn
      import Phoenix.Controller
      import Phoenix.LiveView.Router
    end
  end

  def channel do
    quote do
      use Phoenix.Channel
      import CodebattleWeb.Gettext
    end
  end

  @doc """
  When used, dispatch to the appropriate controller/view/etc.
  """
  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
