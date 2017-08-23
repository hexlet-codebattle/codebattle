defmodule Play.Fsm do
  @moduledoc false

  use Fsm, initial_state: :initial,
    initial_data: %{
      game_id: nil,
      first_player: nil,
      second_player: nil,
      game_over: false,
      winner: nil,
      loser: nil
    }

  defstate initial do
    defevent create(params), data: data do
      next_state(:waiting_opponent, %{data | game_id: params.game_id, first_player: params.user})
    end
  end

  defstate waiting_opponent do
    defevent join(params), data: data do
      player = params[:user]
      case data do
        %{first_player: ^player} ->
          next_state(:waiting_opponent, data)
        _ ->
          next_state(:playing, %{data | second_player: player})
      end
    end
  end

  defstate playing do
    defevent complete(params), data: data do
      cond do
        is_player?(data, params.user) ->
          next_state(:player_won, %{data | winner: params.user})
        true ->
          next_state(:playing, data)
      end
    end

    defevent join(_) do
      respond({:error, "Game is already playing"})
    end
  end

  defstate player_won do
    defevent complete(params), data: data do
      user = params.user
      cond do
        is_player?(data, user) ->
          next_state(:game_over, %{data | loser: user, game_over: true})
        true ->
          next_state(:playing, data)
      end
    end

    defevent join(_) do
      respond({:error, "Game is already playing"})
    end
  end

  defstate game_over do
    defevent _ do
      respond({:error, "Game is over"})
    end
  end

  defp is_player?(data, player) do
    Enum.member?([data.first_player, data.second_player], player)
  end
end
