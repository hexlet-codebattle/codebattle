defmodule CodebattleWeb.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use CodebattleWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_flash(:danger, changeset_error_to_string(changeset))
    |> redirect(to: Routes.root_path(conn, :index))
  end

  def call(conn, {:error, reason}) do
    conn
    |> put_flash(:danger, error_message(reason))
    |> redirect(to: Routes.root_path(conn, :index))
  end

  def changeset_error_to_string(changeset) do
    changeset
    |> Ecto.Changeset.traverse_errors(fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
    |> Enum.reduce("", fn {k, v}, acc ->
      joined_errors = Enum.join(v, "; ")
      "#{acc}#{k}: #{joined_errors}\n"
    end)
  end

  defp error_message(:already_in_a_game) do
    gettext("You are already in a game. Finish or cancel your current game before joining another one.")
  end

  defp error_message(:draining), do: gettext("Deployment in progress, try again in a few moments")
  defp error_message(reason) when is_binary(reason), do: reason
  defp error_message(reason), do: inspect(reason)
end
