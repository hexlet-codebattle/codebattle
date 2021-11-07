defmodule Codebattle.Game.Engine.Standard do
  alias Codebattle.Game.{
    Server,
    Engine,
    GlobalSupervisor,
    Player,
    GameHelpers,
    ActiveGames
  }

  alias Codebattle.Languages
  alias CodebattleWeb.Notifications

  use Engine.Base

  # 1 hour
  @default_timeout 3600
  @timeout_seconds_whitelist [60, 120, 300, 600, 900, 1200, 1800, 3600, 7200]

  @impl Engine.Base

  def create_game(%{users: [creator, recipient], level: level, type: type} = params) do
    task = get_task(level)
    creator_player = Player.build(creator, %{creator: true, task: task})
    recipient_player = Player.build(recipient, %{task: task})

    timeout_seconds = get_timeout_seconds(params.timeout_seconds)

    with :ok <- player_can_create_game?(recipient_player),
         langs <- Languages.get_langs_with_solutions(task),
         {:ok, game} <-
           insert_game(%{
             state: "playing",
             level: level,
             type: type,
             task_id: task.id
           }),
         fsm <-
           build_fsm(%{
             module: __MODULE__,
             players: [creator_player, recipient_player],
             game_id: game.id,
             level: level,
             type: type,
             state: :playing,
             langs: langs,
             starts_at: TimeHelper.utc_now(),
             inserted_at: game.inserted_at,
             timeout_seconds: timeout_seconds,
             task: task
           }),
         :ok <- ActiveGames.create_game(fsm),
         {:ok, _} <- GlobalSupervisor.start_game(fsm),
         :ok <- start_timeout_timer(game.id, fsm) do
      broadcast_active_game(fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def create_game(%{user: user, level: level, type: type} = params) do
    player = Player.build(user, %{creator: true})

    timeout_seconds = get_timeout_seconds(params[:timeout_seconds])

    with :ok <- player_can_create_game?(player),
         {:ok, game} <-
           insert_game(%{
             state: "waiting_opponent",
             level: level,
             type: type
           }),
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
         :ok <- start_timeout_timer(game.id, fsm) do
      broadcast_active_game(fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(fsm, second_user) do
    with type <- GameHelpers.get_type(fsm),
         :ok <- player_can_join_game?(second_user, type),
         game_id <- GameHelpers.get_game_id(fsm),
         level <- GameHelpers.get_level(fsm),
         first_player <- GameHelpers.get_first_player(fsm),
         task <- get_task(level),
         langs <- Languages.get_langs_with_solutions(task),
         {:ok, fsm} <-
           Server.call_transition(game_id, :join, %{
             players: [
               Player.setup_editor_params(first_player, %{task: task}),
               Player.build(second_user, %{task: task})
             ],
             starts_at: TimeHelper.utc_now(),
             task: task,
             langs: langs
           }) do
      ActiveGames.update_game(fsm)
      update_game!(game_id, %{state: "playing", task_id: task.id})
      Notifications.broadcast_join_game(fsm)

      broadcast_active_game(fsm)
      start_timeout_timer(game_id, fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl Engine.Base
  def rematch_send_offer(game_id, user_id) do
    {:ok, fsm} = Server.call_transition(game_id, :rematch_send_offer, %{player_id: user_id})

    case GameHelpers.get_rematch_state(fsm) do
      :accepted ->
        {:ok, game} = create_rematch_game(game)
        GlobalSupervisor.terminate_game(game_id)

        {:rematch_new_game, %{game_id: new_game_id}}

      _ ->
        {:rematch_update_status, Game}
    end
  end

  defp create_rematch_game(fsm) do
    level = GameHelpers.get_level(fsm)
    type = GameHelpers.get_type(fsm)
    timeout_seconds = GameHelpers.get_timeout_seconds(fsm)
    task = get_task(level)

    players =
      fsm
      |> GameHelpers.get_players()
      |> Enum.map(fn player -> Player.setup_editor_params(player, %{task: task}) end)

    {:ok, game} =
      insert_game(%{
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
        langs: Languages.get_langs_with_solutions(task),
        inserted_at: game.inserted_at,
        starts_at: game.inserted_at,
        timeout_seconds: timeout_seconds
      })

    ActiveGames.create_game(fsm)
    {:ok, _} = GlobalSupervisor.start_game(fsm)
    Server.update_playbook(game.id, :join, %{players: players})

    start_timeout_timer(game.id, fsm)
    broadcast_active_game(fsm)
    {:ok, game.id}
  end

  defp get_timeout_seconds(timeout) when is_integer(timeout) do
    if Enum.member?(@timeout_seconds_whitelist, timeout) do
      timeout
    else
      @default_timeout
    end
  end

  defp get_timeout_seconds(timeout) do
    case timeout do
      value when value in ["", nil] -> @default_timeout
      value when is_binary(value) -> value |> String.to_integer() |> get_timeout_seconds()
      _ -> @default_timeout
    end
  end
end