defmodule CodebattleWeb.PrivacyController do
  use CodebattleWeb, :controller

  alias Codebattle.UserSession
  alias CodebattleWeb.Frontend

  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  # Bump whenever the policy text (frontend/src/pages/Privacy.tsx) changes.
  @updated_on "2026-10-18"

  @doc """
  /privacy: one policy for every jurisdiction. The text lives in the frontend
  (translated); the facts that depend on this deployment's config come from here.
  """
  def show(conn, _params) do
    conn
    |> put_meta_tags(%{title: "Privacy Policy · Codebattle"})
    |> assign(:page_title, "Privacy Policy")
    |> Frontend.put_layout()
    |> render_inertia("Privacy", %{
      "updated_on" => @updated_on,
      "session_days" => session_days(),
      "stale_session_days" => UserSession.stale_retention_days(),
      "error_tracking" => present?(Application.get_env(:sentry, :dsn)),
      "firebase_auth" => present?(Application.get_env(:codebattle, :firebase)[:api_key])
    })
  end

  defp session_days do
    max_age = CodebattleWeb.Endpoint.session_options()[:max_age] || 0
    div(max_age, 86_400)
  end

  defp present?(value), do: is_binary(value) and String.trim(value) != ""
end
