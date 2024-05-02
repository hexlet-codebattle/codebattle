defmodule Codebattle.PubSub.Events do
  alias Codebattle.Game
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament

  require Logger

  def get_messages("tournament:created", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:created",
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
        payload: %{id: params.tournament.id}
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

  def get_messages("tournament:player:joined", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}:common",
        event: "tournament:player:joined",
        payload: %{
          player: params.player,
          tournament: %{players_count: params.tournament.players_count}
        }
      },
      %Message{
        topic: "tournament:#{params.tournament.id}",
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
      if params.tournament.waiting_room_name do
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
          event: "waiting_room:player:matchmaking_stopped",
          payload: %{current_player: player}
        }
      else
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
          event: "tournament:player:updated",
          payload: %{player: player}
        }
      end
    ]
  end

  def get_messages("tournament:player:finished", params) do
    player = get_player_changed_fields(params.player)

    [
      if params.tournament.waiting_room_name do
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
          event: "waiting_room:ended",
          payload: %{current_player: player}
        }
      else
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
          event: "tournament:player:updated",
          payload: %{player: player}
        }
      end
    ]
  end

  def get_messages("tournament:player:matchmacking_started", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      },
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "waiting_room:player:matchmacking_started",
        payload: %{current_player: player}
      }
    ]
  end

  def get_messages("tournament:player:banned", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      },
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "waiting_room:player:banned",
        payload: %{current_player: player}
      }
    ]
  end

  def get_messages("tournament:player:matchmaking_paused", params) do
    player = get_player_changed_fields(params.player)

    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:player:updated",
        payload: %{player: player}
      },
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "waiting_room:player:matchmaking_paused",
        payload: %{current_player: player}
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
      },
      %Message{
        topic: "tournament:#{params.tournament.id}:player:#{params.player.id}",
        event: "waiting_room:player:matchmaking_resumed",
        payload: %{current_player: player}
      }
    ]
  end

  def get_messages("tournament:match:created", params) do
    players = Tournament.Helpers.get_players(params.tournament, params.match.player_ids)

    Enum.map(players, fn player ->
      if params.tournament.waiting_room_name do
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{player.id}",
          event: "waiting_room:player:match_created",
          payload: %{
            current_player: player,
            match: params.match,
            players: players
          }
        }
      else
        %Message{
          topic: "tournament:#{params.tournament.id}:player:#{player.id}",
          event: "tournament:match:upserted",
          payload: %{match: params.match, players: players}
        }
      end
    end)
  end

  def get_messages("tournament:match:upserted", params) do
    players = Tournament.Helpers.get_players(params.tournament, params.match.player_ids)

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
    if game.tournament_id do
      []
    else
      [
        %Message{
          topic: "games",
          event: "game:created",
          payload: %{game: game_main_data(game)}
        }
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

  def get_messages("waiting_room:started", params) do
    Logger.debug("WR started, name: " <> inspect(params))

    [
      %Message{
        topic: "waiting_room:#{params.name}",
        event: "waiting_room:started",
        payload: %{name: params.name}
      }
    ]
  end

  def get_messages("waiting_room:matchmaking_started", params) do
    Logger.debug("WR MM started, player_ids: " <> inspect(params.player_ids))

    [
      %Message{
        topic: "waiting_room:#{params.name}",
        event: "waiting_room:matchmaking_started",
        payload: %{player_ids: params.player_ids}
      }
    ]
  end

  def get_messages("waiting_room:matched", params) do
    Logger.debug("WR MM matched, pairs: " <> inspect(params.pairs))

    [
      %Message{
        topic: "waiting_room:#{params.name}",
        event: "waiting_room:matched",
        payload: %{pairs: params.pairs, matched_with_bot: params.matched_with_bot}
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
