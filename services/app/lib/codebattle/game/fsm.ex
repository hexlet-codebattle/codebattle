defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  require Logger
  import Codebattle.Game.Helpers

  alias Codebattle.Game

  @type transition ::
          :join
          | :update_editor_data
          | :timeout
          | :check_success
          | :check_failure
          | :give_up
          | :rematch_reject
          | :rematch_send_offer

  @spec transition(transition, Game.t(), map()) :: {:ok, Game.t()} | {:error, String.t()}
  def transition(:join, %{state: "waiting_opponent"} = game, params) do
    game =
      game
      |> Map.put(state: "playing")
      |> Map.merge(params)

    {:ok, game}
  end

  def transition(:join, game, _) do
    {:error, "Can't join to a game in state: '#{game.state}'"}
  end

  def transition(:update_editor_data, %{state: s} = game, params)
      when s in ["playing", "game_over"] do
    params_to_update = Map.take(params, [:editor_text, :editor_lang])
    game = update_player(game, params.id, params_to_update)
    {:ok, game}
  end

  def transition(:check_success, %{state: "playing"} = game, params) do
    game =
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

    {:ok, game}
  end

  def transition(:check_success, %{state: "game_over"} = game, params) do
    {:ok, update_check_result(game, params)}
  end

  def transition(:check_failure, %{state: s} = game, params) when s in ["playing", "game_over"] do
    {:ok, update_check_result(game, params)}
  end

  def transition(:give_up, %{state: "playing"} = game, params) do
    game =
      game
      |> update_player(params.id, %{result: "gave_up"})
      |> update_other_players(params.id, %{result: "won"})
      |> Game.RatingCalculator.call()
      |> Map.put(:state, "game_over")

    {:ok, game}
  end

  def transition(:give_up, game, _) do
    {:error, "Can't give_up in a game in state: '#{game.state}'"}
  end

  def transition(:timeout, %{state: s, players: players} = game, _params)
      when s in ["waiting_opponent", "playing"] do
    new_players = Enum.map(players, fn player -> %{player | result: "timeout"} end)
    {:ok, %{game | state: "timeout", players: new_players}}
  end

  def transition(:rematch_reject, %{state: "game_over"} = game, _params) do
    {:ok, %{game | rematch_state: "rejected"}}
  end

  def transition(:rematch_send_offer, %{state: "game_over"} = game, params) do
    new_rematch_data = handle_rematch_offer(game, params)
    {:ok, Map.merge(game, new_rematch_data)}
  end

  def transition(transition, game, params) do
    Logger.error(
      "Unknown transition: #{transition}, game_state: #{game.state}, params: #{inspect(params)}"
    )

    {:error, "Unknown transition"}
  end

  defp handle_rematch_offer(%Game{rematch_state: "none"}, params) do
    %{rematch_state: "in_approval", rematch_initiator_id: params.player_id}
  end

  defp handle_rematch_offer(%Game{rematch_state: "in_approval"} = game, params) do
    if params.player_id == game.rematch_initiator_id, do: %{}, else: %{rematch_state: "accepted"}
  end

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
