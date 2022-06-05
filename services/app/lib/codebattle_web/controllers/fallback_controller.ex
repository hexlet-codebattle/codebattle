defmodule CodebattleWeb.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use CodebattleWeb, :controller
  alias Codebattle.UsersActivityServer

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_flash(:danger, changeset_error_to_string(changeset))
    |> redirect(to: Routes.root_path(conn, :index))
  end

  def call(conn, {:error, reason}) do
    UsersActivityServer.add_event(%{
      event: "controller_unexpected_error",
      user_id: conn.assigns.current_user.id,
      data: %{
        reason: reason
      }
    })

    conn
    |> put_flash(:danger, reason)
    |> redirect(to: Routes.root_path(conn, :index))
  end

  def changeset_error_to_string(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
    |> Enum.reduce("", fn {k, v}, acc ->
      joined_errors = Enum.join(v, "; ")
      "#{acc}#{k}: #{joined_errors}\n"
    end)
  end
end
