defmodule Codebattle.GameProcess.Fsm do
  @moduledoc false
  import CodebattleWeb.Gettext
  alias Codebattle.User
  alias Codebattle.Bot.PlaybookStoreTask

  # fsm -> data: %{}, state :initial
  @states [:initial, :waiting_opponent, :playing, :player_won, :game_over]

  use Fsm, initial_state: :initial,
    initial_data: %{
      game_id: nil, # Integer
      task_id: nil, # Integer
      first_player: %User{}, # User
      second_player: %User{}, # User
      game_over: false, # Boolean
      first_player_editor_text: " ", # Space for diff
      second_player_editor_text: " ", # Space for diff
      first_player_time:  nil, # NaiveDateTime.utc_now()
      second_player_time: nil, # NaiveDateTime.utc_now()
      first_player_diff: [], # array of Diffs
      second_player_diff: [], # array of Diffs
      winner: %User{}, # User
      loser: %User{} # User
    }

    # For tests
  def set_data(state, data) do
    setup(new(), state, data)
  end

  defstate initial do
    defevent create(params), data: data do
      next_state(:waiting_opponent, %{data | game_id: params.game_id, first_player: params.user})
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
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

    defevent update_editor_text(_params) do
      next_state(:waiting_opponent)
    end

    # For test
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate playing do
    defevent update_editor_text(params), data: data do
      case user_role(params.user_id, data) do
        :first_player ->
          # TOD : fix empty string diff
          time = data.first_player_time || NaiveDateTime.utc_now
          new_time = NaiveDateTime.utc_now
          diff = [%{
            diff: inspect(Diff.diff(data.first_player_editor_text, params.editor_text)),
            time: NaiveDateTime.diff(new_time, time, :millisecond)
          }]

          new_diff = data.first_player_diff ++ diff
          next_state(:playing, %{data |
            first_player_editor_text: params.editor_text,
            first_player_diff: new_diff,
            first_player_time: new_time
          })

        :second_player ->
          time = data.second_player_time || NaiveDateTime.utc_now
          new_time = NaiveDateTime.utc_now
          diff = [%{
            diff: inspect(Diff.diff(data.second_player_editor_text, params.editor_text)),
            time: NaiveDateTime.diff(new_time, time, :millisecond)
          }]

          new_diff = data.second_player_diff ++ diff
          next_state(:playing, %{data |
            second_player_editor_text: params.editor_text,
            second_player_diff: new_diff,
            second_player_time: new_time
          })

        _ -> next_state(:playing)
      end
    end

    defevent complete(params), data: data do
      case  user_role(params.user.id, data) do
        :first_player ->
          store_playbook(data.first_player_diff, params.user.id, data.game_id)
          next_state(:player_won, %{data | winner: params.user})

        :second_player ->
          store_playbook(data.second_player_diff, params.user.id, data.game_id)
          next_state(:player_won, %{data | winner: params.user})

        _ ->
          respond({:error, dgettext("errors", "You are not player of this game")})
      end
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end
  end

  defstate player_won do
    defevent update_editor_text(params), data: data do
      case user_role(params.user_id, data) do
        :first_player -> next_state(:player_won, %{data | first_player_editor_text: params.editor_text})
        :second_player -> next_state(:player_won, %{data | second_player_editor_text: params.editor_text})
        _ -> next_state(:player_won, data)
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

  defp store_playbook(diff, user_id, game_id) do
    task_params = %{diff: diff,
                    task_id: 1,
                    user_id: user_id,
                    game_id: game_id}
    Task.start(PlaybookStoreTask, :run, [task_params])
  end
end
