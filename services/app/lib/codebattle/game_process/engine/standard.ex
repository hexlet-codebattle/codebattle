defmodule Codebattle.GameProcess.Engine.Standard do
  import Codebattle.GameProcess.Engine.Base
  import Codebattle.GameProcess.Auth

  alias Codebattle.GameProcess.{
    Play,
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    ActiveGames,
    Notifier
  }

  alias Codebattle.{Repo, Game}
  alias Codebattle.Bot.RecorderServer
  alias CodebattleWeb.Notifications

  def create_game(player, params) do
    %{"level" => level, "type" => type, "timeout_seconds" => timeout_seconds} = params

    case player_can_create_game?(player) do
      :ok ->
        game =
          Repo.insert!(%Game{
            state: "waiting_opponent",
            level: level,
            type: type
          })

        fsm =
          Fsm.new()
          |> Fsm.create(%{
            players: [player],
            game_id: game.id,
            level: level,
            type: type,
            starts_at: TimeHelper.utc_now(),
            timeout_seconds: timeout_seconds
          })

        ActiveGames.create_game(game.id, fsm)
        {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

        case type do
          "public" ->
            Task.async(fn ->
              Notifier.call(:game_created, %{level: level, game: game, player: player})
            end)

            Task.async(fn ->
              CodebattleWeb.Endpoint.broadcast!("lobby", "game:new", %{
                game: FsmHelpers.lobby_format(fsm)
              })
            end)

          _ ->
            nil
        end

        {:ok, fsm}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(game_id, second_player) do
    fsm = Play.get_fsm(game_id)
    level = FsmHelpers.get_level(fsm)
    first_player = FsmHelpers.get_first_player(fsm)

    task = get_random_task(level, [first_player.id, second_player.id])

    case Server.call_transition(game_id, :join, %{
           players: [
             Player.rebuild(first_player, task),
             Player.rebuild(second_player, task)
           ],
           joins_at: TimeHelper.utc_now(),
           task: task
         }) do
      {:ok, fsm} ->
        ActiveGames.add_participant(fsm)

        update_game!(game_id, %{state: "playing", task_id: task.id})
        start_record_fsm(game_id, FsmHelpers.get_players(fsm), fsm)

        Task.async(fn ->
          Notifier.call(:game_opponent_join, %{
            first_player: FsmHelpers.get_first_player(fsm),
            second_player: FsmHelpers.get_second_player(fsm),
            game_id: game_id
          })
        end)

        Task.async(fn ->
          CodebattleWeb.Endpoint.broadcast!("lobby", "game:update", %{
            game: FsmHelpers.lobby_format(fsm)
          })
        end)

        start_timeout_timer(game_id, fsm)

        {:ok, fsm}

      {:error, reason, _fsm} ->
        {:error, reason}
    end
  end

  def update_text(game_id, player, editor_text) do
    update_fsm_text(game_id, player, editor_text)
  end

  def update_lang(game_id, player, editor_lang) do
    update_fsm_lang(game_id, player, editor_lang)
  end

  def handle_won_game(game_id, winner, fsm) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)

    store_game_result_async!(fsm, {winner, "won"}, {loser, "lost"})
    :ok = RecorderServer.store(game_id, winner.id)
    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament("game:finished", fsm, %{
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "lost"}
    })
  end

  def handle_give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)
    store_game_result_async!(fsm, {winner, "won"}, {loser, "gave_up"})
    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament("game:finished", fsm, %{
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "gave_up"}
    })
  end

  def handle_rematch_offer_send(fsm, user_id) do
    game_id = FsmHelpers.get_game_id(fsm)

    {_response, new_fsm} =
      Server.call_transition(game_id, :rematch_send_offer, %{player_id: user_id})

    rematch_data = %{
      rematchState: new_fsm.data.rematch_state,
      rematchInitiatorId: new_fsm.data.rematch_initiator_id
    }

    {:rematch_offer, rematch_data}
  end

  def handle_accept_offer(fsm) do
    game_id = FsmHelpers.get_game_id(fsm)
    ActiveGames.terminate_game(game_id)

    task = FsmHelpers.get_task(fsm)
    first_player = FsmHelpers.get_first_player(fsm) |> Player.rebuild(task)
    second_player = FsmHelpers.get_second_player(fsm) |> Player.rebuild(task)
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    game_params = %{"level" => level, "type" => type, "timeout_seconds" => timeout_seconds}

    {:ok, new_fsm} = create_game(first_player, game_params)
    new_game_id = FsmHelpers.get_game_id(new_fsm)
    {:ok, new_fsm} = join_game(new_game_id, second_player)

    start_timeout_timer(new_game_id, new_fsm)

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{
        game: FsmHelpers.lobby_format(new_fsm)
      })
    end)

    {:ok, new_game_id}
  end

  # defp update_game!(game_id, params) do
  #   game_id
  #   |> Play.get_game()
  #   |> Game.changeset(params)
  #   |> Repo.update!()
  # end

  # defp update_user!(user_id, params) do
  #   Repo.get!(User, user_id)
  #   |> User.changeset(params)
  #   |> Repo.update!()
  # end

  # defp create_user_game!(params) do
  #   Repo.insert!(UserGame.changeset(%UserGame{}, params))
  # end
end
