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
      use Phoenix.Controller, formats: [:html, :json]
      use PhoenixMetaTags.TagController
      use Gettext, backend: CodebattleWeb.Gettext

      import Ecto
      import Ecto.Query
      import Phoenix.LiveView.Controller, only: [live_render: 3]

      alias Codebattle.Repo
      alias CodebattleWeb.Router.Helpers, as: Routes

      defp translate_errors(changeset) do
        Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
      end
    end
  end

  def view do
    quote do
      use Phoenix.View,
        root: "lib/codebattle_web/templates",
        namespace: CodebattleWeb

      use PhoenixMetaTags.TagView
      use Gettext, backend: CodebattleWeb.Gettext

      import CodebattleWeb.ErrorHelpers
      import CodebattleWeb.FormHelpers
      import Phoenix.Controller, only: [view_module: 1]
      import Phoenix.HTML
      import Phoenix.HTML.Form

      alias CodebattleWeb.Router.Helpers, as: Routes

      # Import convenience functions from controllers

      # Use all HTML functionality (forms, tags, etc)
      unquote(view_helpers())
    end
  end

  def live_view do
    quote do
      use PhoenixHTMLHelpers

      use Phoenix.LiveView,
        root: "lib/codebattle_web/templates",
        namespace: CodebattleWeb

      use PhoenixMetaTags.TagView
      use Gettext, backend: CodebattleWeb.Gettext

      import CodebattleWeb.ErrorHelpers
      import Phoenix.Controller, only: [view_module: 1]
      import Phoenix.HTML
      import Phoenix.HTML.Form
      import PhoenixHTMLHelpers.Tag

      # Import convenience functions from controllers

      # Use all HTML functionality (forms, tags, etc)

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
      use PhoenixHTMLHelpers

      import Phoenix.HTML
      import Phoenix.HTML.Form
      import PhoenixHTMLHelpers.Tag

      alias CodebattleWeb.Router.Helpers, as: Routes
      alias Phoenix.LiveView.JS
    end
  end

  def router do
    quote do
      use Phoenix.Router

      import Phoenix.Controller
      import Phoenix.LiveView.Router
      import Plug.Conn
    end
  end

  def channel do
    quote do
      use Phoenix.Channel
      use Gettext, backend: CodebattleWeb.Gettext
    end
  end

  @doc """
  When used, dispatch to the appropriate controller/view/etc.
  """
  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
