defmodule CodebattleWeb.UserSocket do
  use Phoenix.Socket

  require Logger
  ## Channels
  channel("lobby", CodebattleWeb.LobbyChannel)
  channel("game:*", CodebattleWeb.GameChannel)
  channel("chat:*", CodebattleWeb.ChatChannel)
  channel("main", CodebattleWeb.MainChannel)

  def connect(%{"token" => user_token}, socket) do
    case Phoenix.Token.verify(socket, "user_token", user_token, max_age: 1_000_000) do
      {:ok, 0} ->
        _socket = assign(socket, :current_user, Codebattle.Bot.Builder.build())

      {:ok, "anonymous"} ->
        socket =
          assign(socket, :current_user, %Codebattle.User{
            guest: true,
            id: 0,
            name: "Anonymous",
            rating: 0
          })

        {:ok, assign(socket, :user_id, "anonymous")}

      {:ok, user_id} ->
        user = Codebattle.User |> Codebattle.Repo.get!(user_id)
        socket = assign(socket, :current_user, user)
        {:ok, assign(socket, :user_id, user_id)}

      {:error, _reason} ->
        :error
    end
  end

  def id(_socket), do: nil
end
