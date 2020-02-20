defmodule Codebattle.GameProcess.Play do
  require Logger

  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game}

  alias Codebattle.GameProcess.{
    Server,
    Engine,
    FsmHelpers,
    ActiveGames
  }

  alias CodebattleWeb.Notifications

  def get_active_games(params \\ %{}), do: ActiveGames.get_games(params)

  def get_completed_games do
    query =
      from(
        games in Game,
        order_by: [desc: games.finishs_at],
        where: [state: "game_over"],
        limit: 20,
        preload: [:users, :user_games]
      )

    Repo.all(query)
  end

  def get_game(id) do
    query = from(g in Game, preload: [:users, :user_games])
    Repo.get(query, id)
  end

  def get_fsm(id), do: Server.get_fsm(id)

  def create_game(params) do
    module = get_module(params)
    module.create_game(params)
  end

  def join_game(id, user) do
    case get_fsm(id) do
      {:ok, fsm} -> FsmHelpers.get_module(fsm).join_game(fsm, user)
      {:error, reason} -> {:error, reason}
    end
  end

  def cancel_game(id, user) do
    case get_fsm(id) do
      {:ok, fsm} -> FsmHelpers.get_module(fsm).cancel_game(fsm, user)
      {:error, reason} -> {:error, reason}
    end
  end

  def update_editor_data(id, user, editor_text, editor_lang) do
    case get_fsm(id) do
      {:ok, fsm} ->
        FsmHelpers.get_module(fsm).update_editor_data(fsm, %{
          id: user.id,
          editor_text: editor_text,
          editor_lang: editor_lang
        })

      {:error, reason} ->
        {:error, reason}
    end
  end

  def check_game(id, user, editor_text, editor_lang) do
    case get_fsm(id) do
      {:ok, fsm} ->
        check_result = checker_adapter().call(FsmHelpers.get_task(fsm), editor_text, editor_lang)

        {:ok, new_fsm} =
          Server.call_transition(id, :check_complete, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        if {fsm.state, new_fsm.state} == {:playing, :game_over} do
          FsmHelpers.get_module(fsm).handle_won_game(id, user, fsm)
          CodebattleWeb.Notifications.finish_active_game(fsm)
          {:ok, new_fsm, %{solution_status: true, check_result: check_result}}
        else
          {:ok, new_fsm, %{solution_status: false, check_result: check_result}}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def give_up(id, user) do
    case Server.call_transition(id, :give_up, %{id: user.id}) do
      {:ok, fsm} ->
        FsmHelpers.get_module(fsm).handle_give_up(id, user.id, fsm)
        {:ok, fsm}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def rematch_send_offer(game_id, user_id) do
    case get_fsm(game_id) do
      {:ok, fsm} ->
        FsmHelpers.get_module(fsm).rematch_send_offer(game_id, user_id)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def rematch_reject(game_id) do
    case Server.call_transition(game_id, :rematch_reject, %{}) do
      {:ok, fsm} ->
        {:rematch_update_status, FsmHelpers.get_rematch_state(fsm)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def timeout_game(id) do
    if ActiveGames.game_exists?(id) do
      Logger.info("Timeout triggered for game_id: #{id}")
      Server.call_transition(id, :timeout, %{})
      ActiveGames.terminate_game(id)
      Notifications.game_timeout(id)
      Notifications.remove_active_game(id)
      {:ok, fsm} = get_fsm(id)
      Notifications.notify_tournament(:game_over, fsm, %{game_id: id, state: "canceled"})

      id
      |> get_game
      |> Game.changeset(%{state: "timeout"})
      |> Repo.update!()

      :ok
    else
      :error
    end
  end

  defp get_module(%{tournament: _}), do: Engine.Tournament
  defp get_module(%{type: "bot"}), do: Engine.Bot
  defp get_module(_), do: Engine.Standard

  defp checker_adapter, do: Application.get_env(:codebattle, :checker_adapter)
end
