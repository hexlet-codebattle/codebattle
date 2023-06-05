defmodule Codebattle.PubSub.Events do
  alias Codebattle.Game
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament

  def get_messages("tournament:created", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:created",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:finished", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:finished",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:updated", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:updated",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:round_created", params) do
    player_games =
      params.tournament
      |> Tournament.Helpers.get_current_round_playing_matches()
      |> Enum.reduce([], fn match, acc ->
        Enum.reduce(match.player_ids, acc, &[%{id: &1, game_id: match.game_id} | &2])
      end)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:round_created",
        payload: %{state: params.tournament.state, player_games: player_games}
      }
    ]
  end

  def get_messages("chat:new_msg", params) do
    [
      %Message{
        topic: chat_topic(params.chat_type),
        event: "chat:new_msg",
        payload: params.message
      }
    ]
  end

  def get_messages("chat:user_banned", params) do
    [
      %Message{
        topic: chat_topic(params.chat_type),
        event: "chat:user_banned",
        payload: params.payload
      }
    ]
  end

  def get_messages("game:updated", %{game: game}) do
    payload = %{
      game: %{
        id: Game.Helpers.get_game_id(game),
        inserted_at: Game.Helpers.get_inserted_at(game),
        is_bot: Game.Helpers.bot_game?(game),
        level: Game.Helpers.get_level(game),
        players: Game.Helpers.get_players(game),
        state: Game.Helpers.get_state(game),
        timeout_seconds: Game.Helpers.get_timeout_seconds(game),
        type: Game.Helpers.get_type(game),
        visibility_type: Game.Helpers.get_visibility_type(game)
      }
    }

    [
      %Message{
        topic: "game:#{game.id}",
        event: "game:updated",
        payload: payload
      },
      %Message{
        topic: "games",
        event: "game:updated",
        payload: payload
      }
    ]
  end

  def get_messages("game:finished", %{game: game}) do
    game_events = [
      %Message{
        topic: "game:#{game.id}",
        event: "game:finished",
        payload: %{game_id: game.id, game_state: game.state}
      },
      %Message{
        topic: "games",
        event: "game:finished",
        payload: %{
          game_id: game.id,
          game_state: game.state,
          game: %{
            id: Game.Helpers.get_game_id(game),
            inserted_at: Game.Helpers.get_inserted_at(game),
            is_bot: Game.Helpers.bot_game?(game),
            level: Game.Helpers.get_level(game),
            players: Game.Helpers.get_players(game),
            state: Game.Helpers.get_state(game),
            timeout_seconds: Game.Helpers.get_timeout_seconds(game),
            type: Game.Helpers.get_type(game),
            visibility_type: Game.Helpers.get_visibility_type(game)
          }
        }
      }
    ]

    tournament_events =
      if game.tournament_id do
        [
          %Message{
            topic: "game:tournament:#{game.tournament_id}",
            event: "game:tournament:finished",
            payload: %{
              game_id: game.id,
              ref: game.ref,
              game_state: game.state,
              game_level: game.level,
              player_results: Game.Helpers.get_player_results(game)
            }
          }
        ]
      else
        []
      end

    game_events ++ tournament_events
  end

  def get_messages("game:terminated", params) do
    [
      %Message{
        topic: "game:#{params.game.id}",
        event: "game:terminated",
        payload: %{game_id: params.game.id}
      },
      %Message{
        topic: "games",
        event: "game:terminated",
        payload: %{game_id: params.game.id}
      }
    ]
  end

  def get_messages("game:check_started", params) do
    payload = %{game_id: params.game.id, user_id: params.user_id}

    [
      %Message{
        topic: "game:#{params.game.id}",
        event: "game:check_started",
        payload: payload
      },
      %Message{
        topic: "games",
        event: "game:check_started",
        payload: payload
      }
    ]
  end

  def get_messages("game:check_completed", params) do
    payload = %{
      game_id: params.game.id,
      user_id: params.user_id,
      check_result: %{
        asserts_count: params.check_result.asserts_count,
        success_count: params.check_result.success_count,
        status: params.check_result.status
      }
    }

    [
      %Message{
        topic: "game:#{params.game.id}",
        event: "game:check_completed",
        payload: payload
      },
      %Message{
        topic: "games",
        event: "game:check_completed",
        payload: payload
      }
    ]
  end

  defp chat_topic(:lobby), do: "chat:lobby"
  defp chat_topic({:tournament, id}), do: "chat:tournament:#{id}"
  defp chat_topic({:game, id}), do: "chat:game:#{id}"
end
