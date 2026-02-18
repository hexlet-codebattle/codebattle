defmodule Codebattle.PubSub.Events do
  @moduledoc false
  alias Codebattle.Game
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament

  def get_messages("deploy:handoff_started", params) do
    [
      %Message{
        topic: "main",
        event: "deploy:handoff_started",
        payload: params
      }
    ]
  end

  def get_messages("deploy:handoff_done", params) do
    [
      %Message{
        topic: "main",
        event: "deploy:handoff_done",
        payload: params
      }
    ]
  end

  def get_messages("deploy:handoff_failed", params) do
    [
      %Message{
        topic: "main",
        event: "deploy:handoff_failed",
        payload: params
      }
    ]
  end

  def get_messages("tournament:created", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:created",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:canceled", params) do
    [
      %Message{
        topic: "season",
        event: "tournament:canceled",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:activated", params) do
    [
      %Message{
        topic: "season",
        event: "tournament:activated",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:updated", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:updated",
        payload: %{tournament: Tournament.Helpers.prepare_to_json(params.tournament)}
      }
    ]
  end

  def get_messages("tournament:round_created", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:round_created",
        payload: %{
          tournament: %{
            last_round_ended_at: params.tournament.last_round_ended_at,
            round_timeout_seconds: params.tournament.round_timeout_seconds,
            break_duration_seconds: params.tournament.break_duration_seconds,
            last_round_started_at: params.tournament.last_round_started_at,
            state: params.tournament.state,
            break_state: "off",
            current_round_position: params.tournament.current_round_position
          }
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:updated",
        payload: %{tournament: Tournament.Helpers.prepare_to_json(params.tournament)}
      }
    ]
  end

  def get_messages("tournament:round_finished", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:round_finished",
        payload: %{
          tournament: %{
            type: params.tournament.type,
            state: params.tournament.state,
            show_results: params.tournament.show_results,
            break_duration_seconds: params.tournament.break_duration_seconds,
            last_round_ended_at: params.tournament.last_round_ended_at,
            last_round_started_at: params.tournament.last_round_started_at,
            current_round_position: params.tournament.current_round_position,
            break_state: "on"
          }
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:updated",
        payload: %{
          tournament:
            params.tournament
            |> Map.put(:break_state, "on")
            |> Tournament.Helpers.prepare_to_json()
        }
      }
    ]
  end

  def get_messages("tournament:results_updated", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament_id}",
        event: "tournament:results_updated",
        payload: %{}
      }
    ]
  end

  def get_messages("tournament:started", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:started",
        payload: %{
          id: params.tournament.id,
          state: params.tournament.state,
          break_state: params.tournament.break_state
        }
      }
    ]
  end

  def get_messages("tournament:finished", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:finished",
        payload: %{
          id: params.tournament.id,
          grade: params.tournament.grade
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:finished",
        payload: %{
          tournament: %{
            type: params.tournament.type,
            state: params.tournament.state,
            show_results: params.tournament.show_results,
            last_round_ended_at: params.tournament.last_round_ended_at,
            last_round_started_at: params.tournament.last_round_started_at,
            current_round_position: params.tournament.current_round_position,
            break_state: "off"
          }
        }
      }
    ]
  end

  def get_messages("tournament:restarted", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:restarted",
        payload: %{
          tournament: Tournament.Helpers.prepare_to_json(params.tournament)
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:restarted",
        payload: %{
          tournament: Tournament.Helpers.prepare_to_json(params.tournament)
        }
      }
    ]
  end

  def get_messages("tournament:player:joined", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:player:joined",
        payload: %{
          player: params.player,
          tournament: %{players_count: params.tournament.players_count}
        }
      }
    ]
  end

  def get_messages("tournament:player:left", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:player:left",
        payload: %{
          player_id: params.player_id,
          tournament: %{players_count: params.tournament.players_count}
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:left",
        payload: %{
          player_id: params.player_id,
          tournament: %{players_count: params.tournament.players_count}
        }
      }
    ]
  end

  def get_messages("tournament:player:finished_round", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ]
  end

  def get_messages("tournament:player:finished", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ]
  end

  def get_messages("tournament:player:matchmaking_started", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ]
  end

  def get_messages("tournament:player:banned", params) do
    player = get_player_changed_fields(params.player)

    game_messages =
      Enum.map(params.game_ids, fn game_id ->
        %Message{
          topic: "game:#{game_id}",
          event: "user:banned",
          payload: %{player: player}
        }
      end)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ] ++ game_messages
  end

  def get_messages("tournament:player:unbanned", params) do
    player = get_player_changed_fields(params.player)

    game_messages =
      Enum.map(params.game_ids, fn game_id ->
        %Message{
          topic: "game:#{game_id}",
          event: "user:unbanned",
          payload: %{player: player}
        }
      end)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ] ++ game_messages
  end

  def get_messages("tournament:player:reported", params) do
    case params.tournament_id do
      nil ->
        []

      _ ->
        [
          %Message{
            topic: "tournament:#{params.tournament_id}",
            event: "tournament:player:reported",
            payload: %{report: params.report}
          }
        ]
    end
  end

  def get_messages("tournament:player:matchmaking_paused", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ]
  end

  def get_messages("tournament:player:matchmaking_resumed", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      }
    ]
  end

  def get_messages("tournament:match:created", params) do
    players =
      params.tournament
      |> Tournament.Helpers.get_players(params.match.player_ids)
      |> Enum.reject(&is_nil/1)

    Enum.map(players, fn player ->
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{player.id}",
        event: "tournament:match:upserted",
        payload: %{match: params.match, players: players}
      }
    end)
  end

  def get_messages("tournament:match:upserted", params) do
    players =
      params.tournament
      |> Tournament.Helpers.get_players(params.match.player_ids)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&get_player_changed_fields/1)

    Enum.map(players, fn player ->
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{player.id}",
        event: "tournament:match:upserted",
        payload: %{match: params.match, players: players}
      }
    end)
  end

  def get_messages("tournament:game:wait", params) do
    [
      %Message{
        topic: "game:#{params.game_id}",
        event: "tournament:game:wait",
        payload: %{type: params.type}
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

  def get_messages("game:created", %{game: game}) do
    user_messages =
      game
      |> Game.Helpers.get_players()
      |> Enum.reject(&is_nil/1)
      |> Enum.map(fn player ->
        %Message{
          topic: "user:#{player.id}",
          event: "user:game_created",
          payload: %{active_game_id: game.id}
        }
      end)

    if game.tournament_id do
      user_messages
    else
      [
        %Message{
          topic: "games",
          event: "game:created",
          payload: %{game: game_main_data(game)}
        }
        | user_messages
      ]
    end
  end

  def get_messages("game:updated", %{game: game}) do
    game_events = [
      %Message{
        topic: "game:#{game.id}",
        event: "game:updated",
        payload: %{game: game_main_data(game)}
      }
    ]

    if game.tournament_id do
      game_events
    else
      [
        %Message{
          topic: "games",
          event: "game:updated",
          payload: %{game: game_main_data(game)}
        }
        | game_events
      ]
    end
  end

  def get_messages("game:finished", %{game: game}) do
    if game.tournament_id do
      [
        %Message{
          topic: "game:#{game.id}",
          event: "game:finished",
          payload: %{game_id: game.id, game_state: game.state}
        },
        %Message{
          topic: "game:tournament:#{game.tournament_id}",
          event: "game:tournament:finished",
          payload: %{
            game_id: game.id,
            task_id: game.task_id,
            ref: game.ref,
            game_state: game.state,
            game_level: game.level,
            duration_sec: game.duration_sec || game.timeout_seconds,
            player_results: Game.Helpers.get_player_results(game)
          }
        }
      ]
    else
      [
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
            tournament_id: game.tournament_id,
            game_state: game.state,
            game: game_main_data(game)
          }
        }
      ]
    end
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

  def get_messages("game:editor_lang_changed", params) do
    payload = %{
      game_id: params.game_id,
      user_id: params.user_id,
      editor_lang: params.editor_lang
    }

    [
      %Message{
        topic: "game:#{params.game_id}",
        event: "game:editor_lang_changed",
        payload: payload
      },
      %Message{
        topic: "games",
        event: "game:editor_lang_changed",
        payload: payload
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

  def get_messages("game:toggle_visible", params) do
    [
      %Message{
        topic: "game:#{params.game_id}",
        event: "game:toggle_visible",
        payload: %{}
      }
    ]
  end

  def get_messages("game:unlocked", params) do
    [
      %Message{
        topic: "game:#{params.game_id}",
        event: "game:unlocked",
        payload: %{}
      }
    ]
  end

  def get_messages("tournament:stream:active_game", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament_id}:stream",
        event: "tournament:stream:active_game",
        payload: %{game_id: params.game_id}
      }
    ]
  end

  defp chat_topic(:lobby), do: "chat:lobby"
  defp chat_topic({:tournament, id}), do: "chat:tournament:#{id}"
  defp chat_topic({:game, id}), do: "chat:game:#{id}"

  defp game_main_data(game) do
    %{
      id: Game.Helpers.get_game_id(game),
      tournament_id: game.tournament_id,
      inserted_at: Game.Helpers.get_inserted_at(game),
      is_bot: Game.Helpers.bot_game?(game),
      level: Game.Helpers.get_level(game),
      players: Game.Helpers.get_players(game),
      state: Game.Helpers.get_state(game),
      timeout_seconds: Game.Helpers.get_timeout_seconds(game),
      type: Game.Helpers.get_type(game),
      visibility_type: Game.Helpers.get_visibility_type(game)
    }
  end

  defp get_player_changed_fields(player) do
    Map.take(player, [:id, :state, :task_ids, :score, :place, :wins_count])
  end
end
