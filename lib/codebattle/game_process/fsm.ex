defmodule Codebattle.GameProcess.Fsm do
  @moduledoc false
  import CodebattleWeb.Gettext
  import Codebattle.GameProcess.FsmHelpers

  alias Codebattle.User
  alias Codebattle.GameProcess.Player

  # fsm -> data: %{}, state :initial
  # @states [:initial, :waiting_opponent, :playing, :player_won, :game_over]

  use Fsm, initial_state: :initial,
    initial_data: %{
      game_id: nil, # Integer
      task: %Codebattle.Task{}, # Task
      players: [] # List with two players %Player{}
    }

    # For tests
  def set_data(state, data) do
    setup(new(), state, data)
  end

  defstate initial do
    defevent create(params), data: data do
      player = %Player{id: params.user.id, user: params.user}
      next_state(:waiting_opponent, %{data | game_id: params.game_id, players: [player], task: params.task})
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate waiting_opponent do
    defevent join(params), data: data do
      if is_player?(data, params.user.id) do
        respond({:error, dgettext("errors", "You are already in a game")})
      else
        player = %Player{id: params.user.id, user: params.user}
        players = data.players ++ [player]
        next_state(:playing, %{data | players: players})
      end
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
      players = update_player_params(data.players, %{game_result: :won, id: params.id})
      next_state(:player_won, %{data | players: players})
    end

    defevent give_up(params), data: data do
      opponent = get_opponent(data, params.id)
      players = update_player_params(data.players, %{game_result: :gave_up, id: params.id})
      players = update_player_params(players, %{game_result: :won, id: opponent.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate player_won do
    defevent update_editor_params(params), data: data do
      players = update_player_params(data.players, params)
      next_state(:player_won, %{data | players: players})
    end

    defevent complete(params), data: data do
      players = update_player_params(data.players, %{game_result: :lost, id: params.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent give_up(params), data: data do
      players = update_player_params(data.players, %{game_result: :gave_up, id: params.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end
  end

  defstate game_over do
    defevent _ do
      respond({:error, dgettext("errors", "Game is over")})
    end
  end

  defp update_player_params(players, params) do
    Enum.map(players, fn(player) ->
      case player.id == params.id do
        true -> Map.merge(player, params)
        _ -> player
      end
    end)
  end
end
