defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  alias Codebattle.Game
  import Codebattle.Game.Helpers

  def join(%{state: "waiting_opponent"} = game, params) do
    %{game | state: "playing"} |> Map.merge(params)
  end

  def join(game, _params), do: game

  def update_editor_data(%{state: "waiting_opponent"} = game, _), do: game

  def update_editor_data(%{state: s} = game, params) when s in ["playing", "game_over"] do
    params_to_update = Map.take(params, [:editor_text, :editor_lang])
    update_player(game, params.id, params_to_update)
  end

  def timeout(%{state: "waiting_opponent"} = game), do: %{game | state: "timeout"}

  def check_success(%{state: "playing"} = game, params) do
    game
    |> update_player(params.id, %{
      result: "won",
      editor_text: params.editor_text,
      editor_lang: params.editor_lang,
      check_result: params.check_result
    })
    |> update_other_players(params.id, %{result: "lost"})
    |> Game.RatingCalculator.call()
    |> Map.put(:state, "game_over")
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

  def give_up(%{state: "playing"} = game, params) do
    game
    |> update_player(params.id, %{result: "gave_up"})
    |> update_other_players(params.id, %{result: "won"})
    |> Game.RatingCalculator.call()
    |> Map.put(:state, "game_over")
  end

  def give_up(game, _params), do: game

  def timeout(%{state: "waiting_opponent"} = game, _params) do
    %{game | state: "timeout"}
  end

  def timeout(%{state: "playing", players: players} = game, _params) do
    new_players = Enum.map(players, fn player -> %{player | result: "timeout"} end)
    %{game | state: "timeout", players: new_players}
  end

  def timeout(game, _params), do: game

  def rematch_reject(%{state: "game_over"} = game, _params) do
    %{game | rematch_state: "rejected"}
  end

  def rematch_send_offer(%{state: "game_over"} = game, params) do
    new_rematch_data = handle_rematch_offer(game, params)
    Map.merge(game, new_rematch_data)
  end

  # def rematch_send_offer(%Game{state: "game_over"} = game, params) do
  #   case game.rematch_state do
  #     "none" ->
  #       %{rematch_state: "in_approval", rematch_initiator_id: params.player_id}

  #     "in_approval" ->
  #       if params.player_id == data.rematch_initiator_id,
  #         do: %{},
  #         else: %{rematch_state: "accepted"}

  #     _ ->
  #       %{}
  #   end
  # end

  def rematch_send_offer(game, _params), do: game

  defp handle_rematch_offer(%Game{rematch_state: "none"}, params) do
    %{rematch_state: "in_approval", rematch_initiator_id: params.player_id}
  end

  defp handle_rematch_offer(%Game{rematch_state: "in_approval"} = game, params),
    do:
      if(params.player_id == game.rematch_initiator_id,
        do: %{},
        else: %{rematch_state: "accepted"}
      )

  defp handle_rematch_offer(_game, _params), do: %{}

  defp update_check_result(game, params) do
    update_player(
      game,
      params.id,
      %{
        check_result: params.check_result,
        editor_text: params.editor_text,
        editor_lang: params.editor_lang
      }
    )
  end
end
