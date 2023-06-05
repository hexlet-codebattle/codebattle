defmodule Codebattle.Game.Fsm do
  @moduledoc """
  Finite state machine for game
  """
  require Logger
  import Codebattle.Game.Helpers

  alias Codebattle.Game

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
  def transition(:join, game = %{state: "waiting_opponent"}, params) do
    game =
      game
      |> Map.put(:state, "playing")
      |> Map.merge(params)

    {:ok, game}
  end

  def transition(:join, game, _) do
    {:error, "Can't join to a game in state: '#{game.state}'"}
  end

  def transition(:update_editor_data, game = %{state: s}, params)
      when s in ["playing", "game_over"] do
    params_to_update = Map.take(params, [:editor_text, :editor_lang])
    game = update_player(game, params.id, params_to_update)
    {:ok, game}
  end

  def transition(:check_success, game = %{state: "playing"}, params) do
    game =
      game
      |> update_check_result(params)
      |> update_player(params.id, %{result: "won"})
      |> update_other_players(params.id, %{result: "lost"})
      |> Game.RatingCalculator.call()
      |> Map.put(:state, "game_over")

    {:ok, game}
  end

  def transition(:check_success, game = %{state: "game_over"}, params) do
    {:ok, update_check_result(game, params)}
  end

  def transition(:check_success, game = %{state: "timeout"}, _params) do
    {:ok, game}
  end

  def transition(:check_failure, game = %{state: s}, params) when s in ["playing", "game_over"] do
    {:ok, update_check_result(game, params)}
  end

  def transition(:check_failure, game = %{state: "timeout"}, _params) do
    {:ok, game}
  end

  def transition(:give_up, game = %{state: "playing", tournament_id: t_id}, _params)
      when not is_nil(t_id),
      do: {:ok, game}

  def transition(:give_up, game = %{state: "playing"}, params) do
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

  def transition(:timeout, game = %{state: s, players: players}, _params)
      when s in ["waiting_opponent", "playing"] do
    new_players = Enum.map(players, fn player -> %{player | result: "timeout"} end)
    {:ok, %{game | state: "timeout", players: new_players}}
  end

  def transition(:timeout, game = %{state: "game_over"}, _params), do: {:ok, game}
  def transition(:timeout, game = %{state: "timeout"}, _params), do: {:ok, game}

  def transition(:rematch_reject, game = %{state: "game_over"}, _params) do
    {:ok, %{game | rematch_state: "rejected"}}
  end

  def transition(:rematch_send_offer, game = %{state: "game_over"}, params) do
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

  defp handle_rematch_offer(game = %Game{rematch_state: "in_approval"}, params) do
    if params.player_id == game.rematch_initiator_id, do: %{}, else: %{rematch_state: "accepted"}
  end

  defp handle_rematch_offer(_game, _params), do: %{}

  defp update_check_result(game, params) do
    game
    |> update_player(
      params.id,
      %{
        check_result: params.check_result,
        editor_text: params.editor_text,
        editor_lang: params.editor_lang
      }
    )
    |> maybe_set_best_results(
      params.id,
      %{
        duration_sec: NaiveDateTime.diff(TimeHelper.utc_now(), game.starts_at),
        result_percent:
          Float.round(
            100 * params.check_result.success_count / params.check_result.asserts_count,
            2
          )
      }
    )
  end
end
