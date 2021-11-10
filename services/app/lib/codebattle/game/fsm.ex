defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  alias Codebattle.Game
  import Codebattle.Game.Helpers

  def join(%{state: "waiting_opponent"} = game, params) do
    %{game | state: "playing"} |> Map.merge(params)
  end

  def update_editor_data(%{state: "waiting_opponent"} = game, _), do: game

  def update_editor_data(%{state: "playing"} = game, params) do
    new_players = update_player_params(game.players, params)
    %{game | players: new_players}
  end

  def update_editor_data(%{state: "game_over"} = game, params) do
    new_players = update_player_params(game.players, params)
    %{game | players: new_players}
  end

  def timeout(%{state: "waiting_opponent"} = game), do: %{game | state: "timeout"}

  def check_success(%{state: "playing", players: players} = game, params) do
    new_players =
      players
      |> update_player_params(%{
        game_result: :won,
        editor_text: params.editor_text,
        editor_lang: params.editor_lang,
        check_result: params.check_result,
        id: params.id
      })
      |> update_players_except(params.id, %{ game_result: :lost })

    %{game | state: "game_over", players: new_players}
  end

  def check_success(%{state: "game_over"} = game, params) do
    update_check_result(game, params)
  end

  def check_success(game, _params), do: game

  def check_failure(%{state: "playing"} = game, params) do
    update_check_result(game, params)
  end

  def check_failure(%{state: "game_over"} = game, params) do
    update_check_result(game, params)
  end

  def check_failure(game, _params), do: game

  def give_up(%{state: "playing", players: players} = game, params) do
    opponent = get_opponent(%{data: data}, params.id)

    new_players =
      players
      |> update_player_params(%{game_result: :gave_up, id: params.id})
      |> update_player_params(%{game_result: :won, id: opponent.id})

    %{game | state: "game_over", players: new_players}
  end

  def give_up(game, _params), do: game

  def timeout(%{state: "playing", players: players} = game, params) do
    new_players =
      Enum.map(players, fn player ->
        %{player | game_result: :timeout}
      end)

    %{game | state: "timeout", players: new_players}
  end

  def timeout(game, _params), do: game

  def rematch_send_offer(%{state: "game_over"} = game, params) do
    new_rematch_data = handle_rematch_offer(game, params)
    Map.merge(game, new_rematch_data)
  end

  def rematch_reject(%{state: "game_over"} = game, params) do
    %{game | rematch_state: "rejected"}
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

  defp handle_rematch_offer(%Game{rematch_state: "none"}, params) do
    %{rematch_state: "in_approval", rematch_initiator_id: params.player_id}
  end

  defp handle_rematch_offer(%Game{rematch_state: "in_approval"} = game, params),
    do:
      if(params.player_id == data.rematch_initiator_id,
        do: %{},
        else: %{rematch_state: :accepted}
      )

  defp handle_rematch_offer(_game, _params), do: %{}

  defp update_check_result(%{players: players} = game, params) do
    new_players =
      update_player_params(
        players,
        %{
          check_result: params.check_result,
          editor_text: params.editor_text,
          editor_lang: params.editor_lang,
          id: params.id
        }
      )

    %{game | players: new_players}
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
