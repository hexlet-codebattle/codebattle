defmodule Codebattle.GameProcess.Engine.Standard do
  use Codebattle.GameProcess.Engine.Base
  import Codebattle.GameProcess.Auth

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Player,
    FsmHelpers,
    ActiveGames,
    Notifier,
    TasksQueuesServer
  }

  alias Codebattle.{Repo, Game}
  alias CodebattleWeb.Notifications

  # 1 hour
  @default_timeout 3600

  def create_game(%{"user" => user, "level" => level, "type" => type} = params) do
    player = Player.build(user, %{creator: true})

    timeout_seconds = params["timeout_seconds"] || @default_timeout

    with :ok <- player_can_create_game?(player),
         {:ok, game} <-
           %Game{}
           |> Game.changeset(%{
             state: "waiting_opponent",
             level: level,
             type: type
           })
           |> Repo.insert(),
         fsm <-
           build_fsm(%{
             module: __MODULE__,
             players: [player],
             game_id: game.id,
             level: level,
             type: type,
             inserted_at: game.inserted_at,
             timeout_seconds: timeout_seconds
           }),
         :ok <- ActiveGames.create_game(fsm),
         {:ok, _} <- GlobalSupervisor.start_game(fsm),
         :ok <- Codebattle.GameProcess.TimeoutServer.restart(game.id, timeout_seconds) do
      case type do
        "public" ->
          Task.start(fn ->
            Notifier.call(:game_created, %{level: level, game: game, player: player})
          end)

          broadcast_active_game(fsm)

        _ ->
          nil
      end

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}

      {:error, reason, _fsm} ->
        {:error, reason}
    end
  end

  def join_game(fsm, second_user) do
    with :ok <- player_can_join_game?(second_user),
         game_id <- FsmHelpers.get_game_id(fsm),
         level <- FsmHelpers.get_level(fsm),
         first_player <- FsmHelpers.get_first_player(fsm),
         task <- TasksQueuesServer.get_task(level),
         {:ok, fsm} <-
           Server.call_transition(game_id, :join, %{
             players: [
               Player.setup_editor_params(first_player, %{task: task}),
               Player.build(second_user, %{task: task})
             ],
             starts_at: TimeHelper.utc_now(),
             task: task
           }) do
      ActiveGames.update_game(fsm)
      update_game!(game_id, %{state: "playing", task_id: task.id})

      Task.start(fn ->
        Notifier.call(:game_opponent_join, %{
          first_player: FsmHelpers.get_first_player(fsm),
          second_player: FsmHelpers.get_second_player(fsm),
          game_id: game_id
        })
      end)

      broadcast_active_game(fsm)

      start_timeout_timer(game_id, fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}

      {:error, reason, _fsm} ->
        {:error, reason}
    end
  end

  def handle_won_game(game_id, winner, fsm) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)
    task = FsmHelpers.get_task(fsm)

    {:ok, playbook} = Server.get_playbook(game_id)
    store_playbook(playbook, game_id, task.id)

    store_game_result!(fsm, {winner, "won"}, {loser, "lost"})
    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament(:game_over, fsm, %{
      state: "finished",
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "lost"}
    })
  end

  def rematch_send_offer(game_id, user_id) do
    {:ok, fsm} = Server.call_transition(game_id, :rematch_send_offer, %{player_id: user_id})

    case FsmHelpers.get_rematch_state(fsm) do
      :accepted ->
        {:ok, new_game_id} = create_rematch_game(fsm)

        {:rematch_new_game, %{game_id: new_game_id}}

      _ ->
        {:rematch_update_status,
         %{
           rematch_initiator_id: FsmHelpers.get_rematch_initiator_id(fsm),
           rematch_state: FsmHelpers.get_rematch_state(fsm)
         }}
    end
  end

  defp create_rematch_game(fsm) do
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    task = TasksQueuesServer.get_task(level)

    players =
      fsm
      |> FsmHelpers.get_players()
      |> Enum.map(fn player -> Player.setup_editor_params(player, %{task: task}) end)

    game =
      Repo.insert!(%Game{
        state: "playing",
        level: level,
        type: type
      })

    fsm =
      build_fsm(%{
        module: __MODULE__,
        state: :playing,
        players: players,
        game_id: game.id,
        level: level,
        type: type,
        task: task,
        inserted_at: game.inserted_at,
        starts_at: game.inserted_at,
        timeout_seconds: timeout_seconds
      })

    ActiveGames.create_game(fsm)
    {:ok, _} = GlobalSupervisor.start_game(fsm)

    Codebattle.GameProcess.TimeoutServer.restart(game.id, timeout_seconds)
    broadcast_active_game(fsm)
    {:ok, game.id}
  end
end
