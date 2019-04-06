defmodule Codebattle.GameProcess.Fsm do
  @moduledoc """
  Finit state machine for game process.
  fsm -> data: %{}, state :initial
  states -> [:initial, :waiting_opponent, :playing, :game_over]
  Player.game_result -> [:undefined, :gave_up, :won, :lost]
  """

  import CodebattleWeb.Gettext
  import Codebattle.GameProcess.FsmHelpers

  use Fsm,
    initial_state: :initial,
    initial_data: %{
      # Integer
      game_id: nil,
      # NaiveDateTime
      starts_at: nil,
      # NaiveDateTime
      joins_at: nil,
      # Task
      task: %Codebattle.Task{},
      # String, level, appears before task created
      level: "",
      # List, with two players %Player{}
      players: [],
      # String, public or private game with friend
      type: "public",
      # Boolean, game played with bot
      bots: false,
      # :Atom,
      rematch_state: nil,

      # timeouts
      timeout_seconds: 15
    }

  # For tests
  def set_data(state, data) do
    setup(new(), state, data)
  end

  defstate initial do
    defevent create(params), data: data do
      {player, new_params} = Map.pop(params, :player)
      new_data = Map.merge(data, new_params)

      next_state(:waiting_opponent, %{
        new_data
        | players: [player]
      })
    end

    defevent create_rematch(params), data: data do

      new_data = Map.merge(data, params)
      next_state(:playing, %{
        new_data | players: params.players, level: params.level,
        type: params.type, task: params.task
      })
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate waiting_opponent do
    defevent join(params), data: data do
      players = data.players ++ [params.player]

      new_data = Map.merge(data, params)

      next_state(:playing, %{
        new_data
        | players: players,
          task: params.task,
          joins_at: params.joins_at
      })
    end

    defevent update_editor_params(_params) do
      next_state(:waiting_opponent)
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate playing do
    defevent update_editor_params(params), data: data do
      players = update_player_params(data.players, params)
      next_state(:playing, %{data | players: players})
    end

    defevent complete(params), data: data do
      opponent = get_opponent(%{data: data}, params.id)
      players = update_player_params(data.players, %{game_result: :won, id: params.id})
      players = update_player_params(players, %{game_result: :lost, id: opponent.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent give_up(params), data: data do
      opponent = get_opponent(%{data: data}, params.id)
      players = update_player_params(data.players, %{game_result: :gave_up, id: params.id})
      players = update_player_params(players, %{game_result: :won, id: opponent.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent timeout(_params), data: data do
      players = Enum.map(data.players, fn player ->
        update_player_params(data.players, %{game_result: :timeout, id: player.id})
      end)

      next_state(:timeout, %{data | players: players})
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate game_over do
    defevent update_editor_params(params), data: data do
      players = update_player_params(data.players, params)
      next_state(:game_over, %{data | players: players})
    end

    defevent _ do
      next_state(:game_over)
    end
  end

  defstate timeout do
    defevent _ do
      next_state(:timeout)
    end
  end

  defp update_player_params(players, params) do
    Enum.map(players, fn player ->
      case player.id == params.id do
        true -> Map.merge(player, params)
        _ -> player
      end
    end)
  end
end
