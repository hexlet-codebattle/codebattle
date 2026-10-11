defmodule Codebattle.PubSub.UserEvents do
  @moduledoc """
  Fans selected domain broadcasts out to per-user topics, `user_events:<user_id>`, so a
  consumer (the public API event stream) subscribes to one topic per user instead of to every
  game and tournament the user might touch.

  Payloads carry the raw structs (`game`, `tournament`); consumers serialize them per viewer.
  Hooked into `Codebattle.PubSub.broadcast/2`, next to `Codebattle.PubSub.Events`.
  """

  alias Codebattle.Game
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament

  @tournament_events %{
    "tournament:started" => "tournament.started",
    "tournament:round_created" => "tournament.round_started",
    "tournament:round_finished" => "tournament.round_finished",
    "tournament:finished" => "tournament.finished",
    "tournament:canceled" => "tournament.canceled",
    "tournament:restarted" => "tournament.restarted"
  }

  def topic(user_id), do: "user_events:#{user_id}"

  @spec messages(String.t(), map()) :: [Message.t()]
  def messages("game:created", %{game: game}) do
    event = if game.state == "playing", do: "game.started", else: "game.created"
    game_messages(game, event)
  end

  # Broadcast when someone joins a waiting game: it starts for both players.
  def messages("game:updated", %{game: %{state: "playing"} = game}), do: game_messages(game, "game.started")
  def messages("game:finished", %{game: game}), do: game_messages(game, "game.finished")
  def messages("game:terminated", %{game: game}), do: game_messages(game, "game.canceled")

  def messages("tournament:player:joined", %{tournament: tournament, player: player}) do
    joined = message(player.id, "tournament.joined", %{tournament: tournament})

    staff =
      tournament
      |> staff_ids()
      |> Enum.reject(&(&1 == player.id))
      |> Enum.map(&message(&1, "tournament.player_joined", %{tournament: tournament, player: player_card(player)}))

    [joined | staff]
  end

  def messages("tournament:player:left", %{tournament: tournament, player_id: player_id}) do
    left = message(player_id, "tournament.left", %{tournament: tournament})

    staff =
      tournament
      |> staff_ids()
      |> Enum.reject(&(&1 == player_id))
      |> Enum.map(&message(&1, "tournament.player_left", %{tournament: tournament, player_id: player_id}))

    [left | staff]
  end

  def messages(event, %{tournament: tournament}) when is_map_key(@tournament_events, event) do
    tournament
    |> audience()
    |> Enum.map(&message(&1, @tournament_events[event], %{tournament: tournament}))
  end

  def messages(_event, _params), do: []

  defp game_messages(game, event) do
    game
    |> Game.Helpers.get_players()
    |> Enum.reject(&(is_nil(&1) or &1.is_bot))
    |> Enum.map(&message(&1.id, event, %{game: game}))
  end

  # Players plus the people running the tournament.
  defp audience(tournament) do
    player_ids =
      try do
        Tournament.Helpers.get_player_ids(tournament)
      rescue
        # the players ETS table is gone once a canceled tournament's server stops
        ArgumentError -> []
      end

    Enum.uniq(staff_ids(tournament) ++ Enum.filter(player_ids, &(&1 > 0)))
  end

  defp staff_ids(tournament) do
    [tournament.creator_id | tournament.moderator_ids || []]
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  defp player_card(player), do: %{id: player.id, name: player.name, rating: Map.get(player, :rating)}

  defp message(user_id, event, payload), do: %Message{topic: topic(user_id), event: event, payload: payload}
end
