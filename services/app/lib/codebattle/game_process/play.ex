defmodule Codebattle.GameProcess.Play do
  @moduledoc """
  The GameProcess context.
  Public interface to interacting with games.
  """

  import Ecto.Query, warn: false
  import Codebattle.GameProcess.Auth

  alias Codebattle.{Repo, Game, UsersActivityServer}

  alias Codebattle.GameProcess.{
    Server,
    Engine,
    Fsm,
    FsmHelpers,
    ActiveGames,
    GlobalSupervisor
  }

  alias CodebattleWeb.Notifications

  def get_active_games(params \\ %{}), do: ActiveGames.get_games(params)

  def get_completed_games do
    query =
      from(
        games in Game,
        order_by: [desc_nulls_last: games.finishs_at],
        where: [state: "game_over"],
        limit: 30,
        preload: [:users, :user_games]
      )

    Repo.all(query)
  end

  def get_game(id) do
    query = from(g in Game, preload: [:users, :user_games])
    Repo.get(query, id)
  end

  def get_fsm(id), do: Server.get_fsm(id)

  def start_game(%{level: level, type: "public", user: user} = params) do
    games =
      %{type: "public", state: :waiting_opponent}
      |> ActiveGames.get_games()
      |> Enum.filter(fn %{level: game_level} ->
        case level do
          "random" -> true
          _ -> game_level == level
        end
      end)

    case games do
      [] ->
        create_game(params)

      games ->
        game = Enum.random(games)

        case join_game(game.id, user) do
          {:ok, fsm} -> {:ok, fsm}
          {:error, _reason} -> create_game(params)
        end
    end
  end

  def start_game(params), do: create_game(params)

  def create_game(%{level: "random"} = params) do
    params |> set_random_level() |> create_game()
  end

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
    Server.update_playbook(id, :start_check, %{
      id: user.id,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    case get_fsm(id) do
      {:ok, fsm} ->
        check_result =
          checker_adapter().call(
            FsmHelpers.get_task(fsm),
            editor_text,
            editor_lang
          )

        {:ok, new_fsm} =
          Server.call_transition(id, :check_complete, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        ActiveGames.update_game(new_fsm)

        winner = FsmHelpers.get_winner(new_fsm) || %{id: nil}

        if {fsm.state, new_fsm.state, winner.id} == {:playing, :game_over, user.id} do
          Server.update_playbook(id, :game_over, %{id: user.id, lang: editor_lang})

          player = FsmHelpers.get_player(new_fsm, user.id)
          type = FsmHelpers.get_type(new_fsm)
          FsmHelpers.get_module(fsm).handle_won_game(id, player, new_fsm)
          finish_active_game(new_fsm, type)
          {:ok, fsm, new_fsm, %{solution_status: true, check_result: check_result}}
        else
          {:ok, fsm, new_fsm, %{solution_status: false, check_result: check_result}}
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
    with {:ok, fsm} <- get_fsm(game_id),
         :ok <- player_can_rematch?(fsm, user_id) do
      FsmHelpers.get_module(fsm).rematch_send_offer(game_id, user_id)
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def rematch_reject(game_id) do
    case Server.call_transition(game_id, :rematch_reject, %{}) do
      {:ok, fsm} ->
        {:rematch_update_status,
         %{
           rematch_initiator_id: FsmHelpers.get_rematch_initiator_id(fsm),
           rematch_state: FsmHelpers.get_rematch_state(fsm)
         }}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def timeout_game(id) do
    {:ok, fsm} = get_fsm(id)

    case {FsmHelpers.get_state(fsm), FsmHelpers.get_tournament_id(fsm)} do
      {:game_over, nil} ->
        {:terminate_after, 15}

      {:game_over, _tournament_id} ->
        {:terminate_after, 20}

      {_, nil} ->
        terminate_game(id)

      {_, _tournament_id} ->
        # TODO: terminate now after auto redirect to next tournament game
        Notifications.notify_tournament(:game_over, fsm, %{game_id: id, state: "canceled"})
        ActiveGames.terminate_game(id)
        Notifications.game_timeout(id)
        {:terminate_after, 20}
    end
  end

  def terminate_game(id) do
    {:ok, fsm} = get_fsm(id)

    case FsmHelpers.get_state(fsm) do
      :game_over ->
        GlobalSupervisor.terminate_game(id)

      _ ->
        Server.call_transition(id, :timeout, %{})
        ActiveGames.terminate_game(id)
        Notifications.game_timeout(id)
        Notifications.remove_active_game(id)
        FsmHelpers.get_module(fsm).store_playbook(fsm)
        GlobalSupervisor.terminate_game(id)

        store_terminate_event(fsm)

        id
        |> get_game
        |> Game.changeset(%{state: "timeout"})
        |> Repo.update!()

        :ok
    end
  end

  defp set_random_level(params) do
    level = Enum.random(["elementary", "easy", "medium", "hard"])
    Map.put(params, :level, level)
  end

  defp get_module(%{tournament: _}), do: Engine.Tournament
  defp get_module(%{type: type}) when type in ["training", "bot"], do: Engine.Bot
  defp get_module(%Fsm{} = fsm), do: FsmHelpers.get_module(fsm)
  defp get_module(_), do: Engine.Standard

  defp checker_adapter, do: Application.get_env(:codebattle, :checker_adapter)

  defp finish_active_game(_fsm, "training"), do: :ok
  defp finish_active_game(fsm, _type), do: Notifications.finish_active_game(fsm)

  defp store_terminate_event(fsm) do
    data = %{
      game_id: FsmHelpers.get_game_id(fsm),
      type: FsmHelpers.get_type(fsm),
      level: FsmHelpers.get_level(fsm),
      task_id: FsmHelpers.get_task(fsm).id
    }

    players = FsmHelpers.get_players(fsm)

    Enum.each(players, fn player ->
      UsersActivityServer.add_event(%{
        event: "game_time_is_over",
        user_id: player.id,
        data: data
      })
    end)
  end
end
