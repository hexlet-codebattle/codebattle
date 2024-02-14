defmodule CodebattleWeb.Api.V1.SettingsController do
  use CodebattleWeb, :controller

  alias Codebattle.Repo
  alias Codebattle.User

  def show(conn, _params) do
    current_user = conn.assigns.current_user

    json(conn, %{
      name: current_user.name,
      clan: current_user.clan,
      github_id: current_user.github_id,
      github_name: current_user.github_name,
      sound_settings: current_user.sound_settings,
      lang: current_user.lang
    })
  end

  def update(conn, user_params) do
    current_user = conn.assigns.current_user

    current_user
    |> User.settings_changeset(user_params)
    |> Repo.update()
    |> case do
      {:ok, user} ->
        json(conn, %{
          name: user.name,
          clan: user.clan,
          sound_settings: user.sound_settings,
          lang: user.lang
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})
    end
  end
end
