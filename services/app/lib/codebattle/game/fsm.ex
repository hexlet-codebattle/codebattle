defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  alias Codebattle.Game.Engine.Standard

  import CodebattleWeb.Gettext
  import Codebattle.Game.GameHelpers

  def join(%{state: "waiting_opponent"} = game, params) do
    %{game | state: "playing"} |> Map.merge(params)
  end

  def update_editor_data(%{state: "waiting_opponent"} = game, _), do: game

  def update_editor_data(%{state: "playing"} = game, params) do
    new_players = update_player_params(game.players, params)
    %{game | players: new_players}
  end

  def timeout(%{state: "waiting_opponent"} = game), do: %{game | state: "timeout"}

  def check_success(%{state: "playing"} = game, params) do
          opponent = get_opponent(%{data: data}, params.id)
         new_players =
            game
            |> Map.get(:players)
            |> update_player_params(%{
              game_result: :won,
              check_result: params.check_result,
              editor_text: params.editor_text,
              editor_lang: params.editor_lang,
              id: params.id
            })
            |> update_player_params(%{game_result: :lost, id: opponent.id})

    %{game | state: "game_over", players: new_players}
  end

  def check_failure(%{state: "playing"} = game, params) do
        players =
          game
          |> Map.get(:players)
          |> update_player_params(%{check_result: params.check_result, id: params.id})

        %{game | players: new_players}
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

  def rematch_send_offer(%Game{state: "game_over"} = game) do
    case game.rematch_state do
      "none" ->
        %{rematch_state: "in_approval", rematch_initiator_id: params.player_id}

      "in_approval" ->
        if params.player_id == data.rematch_initiator_id,
          do: %{},
          else: %{rematch_state: "accepted"}

      _ ->
        %{}
    end
  end

  def rematch_send_offer(game), do: game

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
