defmodule Bot do
  def create_game(user, %{"level" => level, "type" => type}) do
    bot_player = Player.from_user(bot, %{creator: true})

    game =
      Repo.insert!(%Game{state: "waiting_opponent",  level: level, type: type})

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        player: bot_player,
        level: level,
        game_id: game.id,
        bots: true,
        starts_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(bot, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: fsm})
    end)

    {:ok, game.id}
  end

  def join_game(game_id, user) do
    game = get_game(game_id)
    fsm = get_fsm(game_id)
    first_player = FsmHelpers.get_first_player(fsm)
    second_player = Player.from_user(user)
    level = FsmHelpers.get_level(fsm)

    case get_playbook(level) do
      {:ok, playbook} ->
        # todo update second players in game
        game
        |> Game.changeset(%{state: "playing", task: playbook.task})
        |> Repo.update!()

        case Server.call_transition(game_id, :join, %{
               player: second_player,
               starts_at: TimeHelper.utc_now()
             }) do
          {:ok, fsm} ->
            ActiveGames.add_participant(fsm)

            {:ok, _} =
              Codebattle.Bot.Supervisor.start_bot_record_server(game_id, second_player, fsm)

            Codebattle.Bot.PlaybookAsyncRunner.call(%{
              game_id: game_id,
              task_id: playbook.task.id
            })

            {:ok, fsm}

          {:error, _reason} ->
            {:error, _reason}
        end

      {:error, _reason} ->
        {:error, _reason}
    end
  end

  def get_playbook(level) do
    query =
      from(
        playbook in Playbook,
        join: task in "tasks",
        on: task.id == playbook.task_id,
        order_by: fragment("RANDOM()"),
        where: task.level == ^level,
        limit: 1
      )

    playbook = Repo.one(query)

    if playbook do
      {:ok, playbook}
    else
      {:error, :playbook_not_found}
    end
  end
end
