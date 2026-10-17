defmodule CodebattleWeb.Api.V1.LocaleController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.User
  alias CodebattleWeb.Plugs.Locale

  def update(conn, %{"locale" => locale}) when locale in ["en", "ru"] do
    cond do
      Locale.forced?() ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Locale is fixed for this deployment"})

      conn.assigns.current_user.is_guest ->
        save_session_locale(conn, locale)

      true ->
        conn.assigns.current_user
        |> User.settings_changeset(%{"locale" => locale})
        |> Repo.update()
        |> case do
          {:ok, _user} ->
            save_session_locale(conn, locale)

          {:error, _changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "Could not save locale"})
        end
    end
  end

  def update(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Unsupported locale"})
  end

  defp save_session_locale(conn, locale) do
    conn
    |> put_session(:locale, locale)
    |> json(%{locale: locale})
  end
end
