defmodule Codebattle.GameProcess.Fsm do
  @moduledoc """
  Finite state machine for game process.
  fsm -> data: %{}, state :initial
  types -> ["public", "bot", "training", "tournament", "private"]
  states -> [:initial, :waiting_opponent, :playing, :game_over, :timeout]
  rematch_states -> [:none, :in_approval, :rejected, :accepted]
  Player.game_result -> [:undefined, :gave_up, :won, :lost]
  """
  alias Codebattle.GameProcess.Engine.Standard

  import CodebattleWeb.Gettext
  import Codebattle.GameProcess.FsmHelpers

  use Fsm,
    initial_state: :initial,
    initial_data: %{
      # Atom, module with game functions; OOP for poor
      module: Standard,
      # Integer
      game_id: nil,
      # Integer
      tournament_id: nil,
      # NaiveDateTime
      inserted_at: nil,
      # NaiveDateTime
      starts_at: nil,
      # NaiveDateTime
      finishs_at: nil,
      # Task
      task: %Codebattle.Task{},
      # String, level, appears before task created
      level: "",
      # List, with two players %Player{}
      players: [],
      # String, public or private game with friend
      type: "public",
      # timeouts
      timeout_seconds: 0,
      # Atom, state of rematch negotiations
      rematch_state: :none,
      # Integer, player_id who sended offer to rematch
      rematch_initiator_id: nil,

      # {List, Map}, maps with langs for game and solution templates
      langs: []
    }

  # For tests
  def set_data(state, data) do
    setup(new(), state, data)
  end

  defstate initial do
    defevent create(params), data: data do
      new_state = params[:state] || :waiting_opponent
      next_state(new_state, Map.merge(data, params))
    end

    # For tests
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate waiting_opponent do
    defevent join(params), data: data do
      next_state(:playing, Map.merge(data, params))
    end

    defevent update_editor_data(_params) do
      next_state(:waiting_opponent)
    end

    defevent timeout(_params) do
      next_state(:timeout)
    end

    # For tests
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate playing do
    defevent update_editor_data(params), data: data do
      players = update_player_params(data.players, params)
      next_state(:playing, %{data | players: players})
    end

    defevent check_complete(params), data: data do
      case params.check_result.status do
        :ok ->
          opponent = get_opponent(%{data: data}, params.id)

          players =
            data
            |> Map.get(:players)
            |> update_player_params(%{
              game_result: :won,
              check_result: params.check_result,
              editor_text: params.editor_text,
              editor_lang: params.editor_lang,
              id: params.id
            })
            |> update_player_params(%{game_result: :lost, id: opponent.id})

          next_state(:game_over, %{data | players: players})

        _ ->
          players =
            data
            |> Map.get(:players)
            |> update_player_params(%{check_result: params.check_result, id: params.id})

          next_state(:playing, %{data | players: players})
      end
    end

    defevent give_up(params), data: data do
      opponent = get_opponent(%{data: data}, params.id)
      players = update_player_params(data.players, %{game_result: :gave_up, id: params.id})
      players = update_player_params(players, %{game_result: :won, id: opponent.id})
      next_state(:game_over, %{data | players: players})
    end

    defevent timeout(_params), data: data do
      players =
        update_player_params(data.players, %{
          game_result: :timeout,
          id: get_first_player(%{data: data}).id
        })

      players =
        update_player_params(players, %{
          game_result: :timeout,
          id: get_second_player(%{data: data}).id
        })

      next_state(:timeout, %{data | players: players})
    end

    defevent join(_) do
      respond({:error, dgettext("errors", "Game is already playing")})
    end

    # For tests
    defevent setup(state, new_data), data: data do
      next_state(state, Map.merge(data, new_data))
    end
  end

  defstate game_over do
    defevent check_complete(params), data: data do
      players =
        data
        |> Map.get(:players)
        |> update_player_params(%{
          id: params.id,
          check_result: params.check_result,
          editor_text: params.editor_text,
          editor_lang: params.editor_lang
        })

      next_state(:game_over, %{data | players: players})
    end

    defevent update_editor_data(params), data: data do
      players = update_player_params(data.players, params)
      next_state(:game_over, %{data | players: players})
    end

    defevent rematch_send_offer(params), data: data do
      new_data = handle_rematch_offer(data, params)
      next_state(:game_over, Map.merge(data, new_data))
    end

    defevent rematch_reject(_params), data: data do
      next_state(:game_over, %{data | rematch_state: :rejected})
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

  defp handle_rematch_offer(data, params) do
    case data.rematch_state do
      :none ->
        %{rematch_state: :in_approval, rematch_initiator_id: params.player_id}

      :in_approval ->
        if params.player_id == data.rematch_initiator_id,
          do: %{},
          else: %{rematch_state: :accepted}

      _ ->
        %{}
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
