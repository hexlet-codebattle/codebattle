defmodule Standard do
  def create_game(player, %{"level" => level, "type" => type}) do
    game = Repo.insert!(%Game{
        state: "waiting_opponent",
        level: level,
        type: type
      })

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        player: player,
        game_id: game.id,
        level: level,
        type: type,
        starts_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(player, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: fsm})
    end)

    case type do
      "public" ->
        Task.async(fn ->
          Notifier.call(:game_created, %{level: level, game: game, player: player})
        end)

      _ ->
        nil
    end

    {:ok, game.id}
  end

  def join_game(game_id, user) do
    game = get_game(game_id)
    fsm = get_fsm(game_id)
    first_player = FsmHelpers.get_first_player(fsm)
    second_player = Player.from_user(user)

    task = get_random_task(game.level, [first_player.id, second_player.id])

    case Server.call_transition(id, :join, %{
           player: second_player,
           joins_at: TimeHelper.utc_now(),
           task: task
         }) do
      {:ok, fsm} ->
        ActiveGames.add_participant(fsm)

        # todo update second players in game
        game
        |> Game.changeset(%{state: "playing", task_id: task.id})
        |> Repo.update!()

        {:ok, _} = Codebattle.Bot.Supervisor.start_bot_record_server(id, first_player, fsm)
        {:ok, _} = Codebattle.Bot.Supervisor.start_bot_record_server(id, second_player, fsm)

        Notifier.call(:game_opponent_join, %{
          first_player: first_player,
          second_player: second_player,
          game_id: id
        })

        {:ok, fsm}

      {:error, _reason} ->
        {:error, _reason}
    end
  end

  def give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)
    winner_user = Repo.get(User, winner.id)

    difficulty = fsm.data.level
    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, difficulty)
    winner_rating_diff = winner_rating - winner.rating
    loser_rating_diff = loser_rating - loser.rating

    duration = NaiveDateTime.diff(TimeHelper.utc_now(), FsmHelpers.get_starts_at(fsm))
  end

  def handle_won_game(game_id, player, fsm)

  defp get_random_task(level, user_ids) do
    qry = """
    WITH game_tasks AS (SELECT count(games.id) as count, games.task_id FROM games
    INNER JOIN "user_games" ON "user_games"."game_id" = "games"."id"
    WHERE "games"."level" = $1 AND "user_games"."user_id" IN ($2, $3)
    GROUP BY "games"."task_id")
    SELECT "tasks".*, "game_tasks".* FROM tasks
    LEFT JOIN game_tasks ON "tasks"."id" = "game_tasks"."task_id"
    WHERE "tasks"."level" = $1
    ORDER BY "game_tasks"."count" NULLS FIRST
    LIMIT 30
    """

    # TODO: get list and then get random in elixir

    res = Ecto.Adapters.SQL.query!(Repo, qry, [level, Enum.at(user_ids, 0), Enum.at(user_ids, 1)])

    cols = Enum.map(res.columns, &String.to_atom(&1))

    tasks =
      Enum.map(res.rows, fn row ->
        struct(Codebattle.Task, Enum.zip(cols, row))
      end)

    min_task = List.first(tasks)

    filtered_task = Enum.filter(tasks, fn x -> Map.get(x, :count) == min_task.count end)
    Enum.random(filtered_task)
  end
end
