defmodule CodebattleWeb.StreamerSocket do
  @moduledoc false
  use Phoenix.Socket

  channel("tournament_streamer", CodebattleWeb.TournamentStreamerChannel)

  def connect(%{"token" => token, "tournament_id" => raw_id}, socket) do
    api_key = Application.get_env(:codebattle, :api_key)

    with true <- is_binary(api_key) and api_key != "" and api_key == token,
         {:ok, tournament_id} <- parse_tournament_id(raw_id) do
      {:ok,
       socket
       |> assign(:streamer?, true)
       |> assign(:tournament_id, tournament_id)}
    else
      _ -> :error
    end
  end

  def connect(_params, _socket), do: :error

  def id(_socket), do: nil

  defp parse_tournament_id(id) when is_integer(id) and id > 0, do: {:ok, id}

  defp parse_tournament_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {n, ""} when n > 0 -> {:ok, n}
      _ -> :error
    end
  end

  defp parse_tournament_id(_), do: :error
end
