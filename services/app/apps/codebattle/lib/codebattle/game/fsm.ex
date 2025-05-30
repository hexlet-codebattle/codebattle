defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  import Codebattle.Game.Helpers

  alias Codebattle.Game

  require Logger

  @type event ::
          :join
          | :update_editor_data
          | :timeout
          | :check_success
          | :check_failure
          | :give_up
          | :rematch_reject
          | :rematch_send_offer

  @spec transition(event, Game.t(), map()) :: {:ok, Game.t()} | {:error, String.t()}
  def transition(:join, %{state: "waiting_opponent"} = game, params) do
    game =
      game
      |> Map.put(:state, "playing")
      |> Map.merge(params)

    {:ok, game}
  end

  def transition(:join, game, _) do
    {:error, "Can't join to a game in state: '#{game.state}'"}
  end

  def transition(:update_editor_data, %{state: s} = game, params) when s in ["playing", "game_over", "timeout"] do
    params_to_update = Map.take(params, [:editor_text, :editor_lang])
    game = update_player(game, params.id, params_to_update)
    {:ok, game}
  end

  def transition(:check_success, %{state: "playing"} = game, params) do
    game =
      game
      |> update_check_result(params)
      |> update_player(params.id, %{result: "won"})
      |> update_other_players(params.id, %{result: "lost"})
      |> Game.RatingCalculator.call()
      |> finished_game_with_state("game_over")

    {:ok, game}
  end

  def transition(:check_success, %{state: "game_over"} = game, params) do
    {:ok, update_check_result(game, params)}
  end

  def transition(:check_success, %{state: "timeout"} = game, _params) do
    {:ok, game}
  end

  def transition(:check_failure, %{state: s} = game, params) when s in ["playing", "game_over"] do
    {:ok, update_check_result(game, params)}
  end

  def transition(:check_failure, %{state: "timeout"} = game, _params) do
    {:ok, game}
  end

  def transition(:give_up, %{state: "playing", tournament_id: t_id} = game, _params) when not is_nil(t_id),
    do: {:ok, game}

  def transition(:give_up, %{state: "playing"} = game, params) do
    game =
      game
      |> update_player(params.id, %{result: "gave_up"})
      |> update_other_players(params.id, %{result: "won"})
      |> Game.RatingCalculator.call()
      |> finished_game_with_state("game_over")

    {:ok, game}
  end

  def transition(:give_up, game, _) do
    {:error, "Can't give_up in a game in state: '#{game.state}'"}
  end

  def transition(:timeout, %{state: s, players: players} = game, _params) when s in ["waiting_opponent", "playing"] do
    new_players = Enum.map(players, fn player -> %{player | result: "timeout"} end)

    game =
      game
      |> Map.put(:players, new_players)
      |> finished_game_with_state("timeout")

    {:ok, game}
  end

  def transition(:timeout, %{state: "game_over"} = game, _params), do: {:ok, game}
  def transition(:timeout, %{state: "timeout"} = game, _params), do: {:ok, game}

  def transition(:rematch_reject, %{state: "game_over"} = game, _params) do
    {:ok, %{game | rematch_state: "rejected"}}
  end

  def transition(:rematch_send_offer, %{state: "game_over"} = game, params) do
    new_rematch_data = handle_rematch_offer(game, params)
    {:ok, Map.merge(game, new_rematch_data)}
  end

  def transition(:unlock_game, game, _params) do
    {:ok, Map.put(game, :locked, false)}
  end

  def transition(:toggle_ban_player, game, %{id: player_id}) do
    new_players =
      Enum.map(game.players, fn player ->
        if player.id == player_id do
          %{player | is_banned: !player.is_banned}
        else
          player
        end
      end)

    {:ok, Map.put(game, :players, new_players)}
  end

  def transition(transition, game, params) do
    Logger.error("Unknown transition: #{transition}, game_state: #{game.state}, params: #{inspect(params)}")

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
    update_player(game, params.id, %{
      check_result: params.check_result,
      editor_text: params.editor_text,
      editor_lang: params.editor_lang,
      result_percent:
        Float.round(
          100.0 * params.check_result.success_count / params.check_result.asserts_count,
          2
        )
    })
  end

  defp finished_game_with_state(game, state) do
    finishes_at = TimeHelper.utc_now()

    game
    |> Map.put(:state, state)
    |> Map.put(:finishes_at, finishes_at)
    |> Map.put(:duration_sec, NaiveDateTime.diff(finishes_at, game.starts_at))
  end
end
