defmodule Codebattle.GameProcess.Fsm do
  @moduledoc false
  import CodebattleWeb.Gettext

  # fsm -> data: %{}, state :initial
  @states [:initial, :waiting_opponent, :playing, :player_won, :game_over]

  use Fsm, initial_state: :initial,
    initial_data: %{
      game_id: nil,
      first_player: nil, # User
      second_player: nil, # User
      game_over: false,
      first_player_editor_data: "", # String
      second_player_editor_data: "", # String
      winner: nil, # User
      loser: nil # User
    }

  defstate initial do
    defevent create(params), data: data do
      next_state(:waiting_opponent, %{data | game_id: params.game_id, first_player: params.user})
    end
  end

  defstate waiting_opponent do
    defevent join(params), data: data do
      player = params[:user]
      if data.first_player.id == player.id do
        respond({:error, dgettext("errors", "You are already in game")})
      else
        next_state(:playing, %{data | second_player: player})
      end
    end
  end

  defstate playing do
    defevent update_editor_data(params), data: data do
      case user_role(params.user_id, data) do
        :first_player -> next_state(:playing, %{data | first_player_editor_data: params.data})
        :second_player -> next_state(:playing, %{data | second_player_editor_data: params.data})
        _ -> next_state(:playing)
      end
    end

    defevent complete(params), data: data do
      if is_player?(data, params.user) do
        next_state(:player_won, %{data | winner: params.user})
      else
        respond({:error, dgettext("errors", "You are not player of this game")})
      end
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end
  end

  defstate player_won do
    defevent update_editor_data(params), data: data do
      case user_role(params.user_id, data) do
        :first_player -> next_state(:playing, %{data | first_player_editor_data: params.data})
        :second_player -> next_state(:playing, %{data | second_player_editor_data: params.data})
        _ -> next_state(:playing, data)
      end
    end

    defevent complete(params), data: data do
      if can_complete?(data, params.user) do
        next_state(:game_over, %{data | loser: params.user, game_over: true})
      else
        respond({:error, dgettext("errors", "You cannot check result after win")})
      end
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

  defp is_player?(data, player) do
    Enum.member?([data.first_player.id, data.second_player.id], player.id)
  end

  defp can_complete?(data, player) do
    if is_player?(data, player) do
      !(data.winner.id == player.id)
    else
      false
    end
  end

  defp user_role(user_id, data) do
    cond do
      data.first_player.id == user_id -> :first_player
      data.second_player.id == user_id -> :second_player
      true -> :spectator
    end
  end
end
