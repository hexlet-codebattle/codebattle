defmodule Codebattle.GameProcess.Play do
  require Logger

  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game, User, UserGame}

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    Elo,
    ActiveGames,
    Notifier
  }

  alias Codebattle.CodeCheck.Checker
  alias Codebattle.Bot.RecorderServer

  def list_games do
    ActiveGames.list_games()
  end

  def completed_games do
    query =
      from(
        games in Game,
        order_by: [desc: games.updated_at],
        where: [state: "game_over"],
        limit: 30,
        preload: [:users, :user_games]
      )

    games = Repo.all(query)

    Enum.map(games, fn game ->
      winner_user_game =
        game.user_games
        |> Enum.filter(fn user_game -> user_game.result == "won" end)
        |> List.first()

      winner =
        Map.get(winner_user_game, :user)
        |> Map.merge(%{creator: winner_user_game.creator, game_result: winner_user_game.result})

      loser_user_game =
        game.user_games
        |> Enum.filter(fn user_game -> user_game.result != "won" end)
        |> List.first()

      loser =
        Map.get(loser_user_game, :user)
        |> Map.merge(%{creator: loser_user_game.creator, game_result: loser_user_game.result})

      %{updated_at: updated_at} = game

      players =
        [winner, loser]
        |> Enum.sort(&(&1.creator > &2.creator))

      %{
        id: game.id,
        players: players,
        updated_at: updated_at,
        duration: game.duration_in_seconds,
        level: game.task_level
      }
    end)
  end

  def get_game(id) do
    query = from(g in Game, preload: [:users, :user_games])
    Repo.get(query, id)
  end

  def get_fsm(id) do
    Server.fsm(id)
  end

  def create_game(user, level) do
    case ActiveGames.playing?(user.id) do
      false ->
        game =
          Repo.insert!(%Game{
            state: "waiting_opponent",
            users: [user],
            task_level: level
          })

        fsm =
          Fsm.new()
          |> Fsm.create(%{
            user: user,
            game_id: game.id,
            level: level
          })

        ActiveGames.create_game(user, fsm)
        GlobalSupervisor.start_game(game.id, fsm)

        Task.async(fn -> CodebattleWeb.Endpoint.broadcast("lobby", "new:game", %{game: fsm}) end)

        Task.async(fn ->
          Notifier.call(:game_created, %{level: level, game: game, user: user})
        end)

        {:ok, game.id}

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def join_game(id, user) do
    if ActiveGames.playing?(user.id) do
      :error
    else
      game = get_game(id)

      user2 = get_fsm(id) |> FsmHelpers.get_users() |> List.first()
      task = get_random_task(game.task_level, [user.id, user2.id])

      game
      |> Game.changeset(%{state: "playing", task_id: task.id})
      |> Repo.update!()

      case Server.call_transition(id, :join, %{
             user: user,
             starts_at: NaiveDateTime.utc_now(),
             task: task
           }) do
        {:ok, fsm} ->
          ActiveGames.add_participant(user, fsm)

          Notifier.call(:game_opponent_join, %{
            creator: FsmHelpers.get_opponent(fsm.data, user.id),
            user: user,
            game_id: id
          })

          {:ok, fsm}

        {{:error, _reason}, fsm} ->
          :error
      end
    end
  end

  def cancel_game(id, user) do
    if ActiveGames.participant?(id, user.id) do
      ActiveGames.terminate_game(id)

      id
      |> get_game
      |> Game.changeset(%{state: "canceled"})
      |> Repo.update!()

      :ok
    else
      :error
    end
  end

  def game_info(id) do
    # TODO: change first and second atoms to user ids, or list
    fsm = get_fsm(id)

    %{
      status: fsm.state,
      starts_at: fsm.data.starts_at,
      players: fsm.data.players,
      task: fsm.data.task,
      level: fsm.data.level,
      winner: FsmHelpers.get_winner(fsm)
    }
  end

  def update_editor_text(id, user_id, editor_text) do
    RecorderServer.update_text(id, user_id, editor_text)
    Server.call_transition(id, :update_editor_params, %{id: user_id, editor_text: editor_text})
  end

  # FIXME: add lang validation
  def update_editor_lang(id, user_id, editor_lang) do
    case Repo.get(User, user_id) do
      user ->
        user |> Ecto.Changeset.change(%{lang: editor_lang}) |> Repo.update!()

      nil ->
        nil
    end

    RecorderServer.update_lang(id, user_id, editor_lang)
    Server.call_transition(id, :update_editor_params, %{id: user_id, editor_lang: editor_lang})
  end

  def give_up(id, user) do
    # TODO: terminate Bot.RecordServer for this
    # RecorderServer.update_lang(id, user_id, editor_lang)
    {_response, fsm} = Server.call_transition(id, :give_up, %{id: user.id})
    handle_gave_up(id, user, fsm)
  end

  def check_game(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    RecorderServer.update_text(id, user.id, editor_text)
    RecorderServer.update_lang(id, user.id, editor_lang)
    check = check_code(fsm.data.task, editor_text, editor_lang)
    # TODO: be race condition tolerance
    case {fsm.state, check} do
      {:playing, {:ok, result, output}} ->
        Server.call_transition(id, :update_editor_params, %{
          id: user.id,
          result: result,
          output: output
        })

        {_response, fsm} = Server.call_transition(id, :complete, %{id: user.id})
        handle_won_game(id, user, fsm)
        {:ok, fsm, result, output}

      {:playing, {:error, result, output}} ->
        Server.call_transition(id, :update_editor_params, %{
          id: user.id,
          result: result,
          output: output
        })

        {:error, result, output}

      {:game_over, {:error, result, output}} ->
        Server.call_transition(id, :update_editor_params, %{
          id: user.id,
          result: result,
          output: output
        })

        {:error, result, output}

      {:game_over, {:ok, result, output}} ->
        Server.call_transition(id, :update_editor_params, %{
          id: user.id,
          result: result,
          output: output
        })

        {:ok, result, output}
    end
  end

  defp check_code(task, editor_text, lang_slug) do
    Checker.check(task, editor_text, lang_slug)
  end

  defp handle_won_game(id, winner, fsm) do
    RecorderServer.store(id, winner.id)
    # TODO: make async
    # TODO: optimize code with handle_gave_up
    game_id = id |> Integer.parse() |> elem(0)
    loser = FsmHelpers.get_opponent(fsm.data, winner.id)
    difficulty = fsm.data.level

    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, difficulty)

    duration = NaiveDateTime.diff(NaiveDateTime.utc_now(), fsm.data.starts_at)

    game_id
    |> get_game
    |> Game.changeset(%{state: to_string(fsm.state), duration_in_seconds: duration})
    |> Repo.update!()

    # TODO: fix creator please!!!!!
    Repo.insert!(%UserGame{
      game_id: game_id,
      user_id: winner.id,
      result: "won",
      creator: winner.creator
    })

    Repo.insert!(%UserGame{
      game_id: game_id,
      user_id: loser.id,
      result: "lost",
      creator: loser.creator
    })

    if winner.id != 0 do
      winner
      |> User.changeset(%{rating: winner_rating})
      |> Repo.update!()
    end

    if loser.id != 0 do
      loser
      |> User.changeset(%{rating: loser_rating})
      |> Repo.update!()
    end

    ActiveGames.terminate_game(game_id)
  end

  defp handle_gave_up(id, loser, fsm) do
    game_id = id |> Integer.parse() |> elem(0)
    winner = FsmHelpers.get_opponent(fsm.data, loser.id)
    difficulty = fsm.data.level

    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, difficulty)

    duration = NaiveDateTime.diff(NaiveDateTime.utc_now(), fsm.data.starts_at)

    game_id
    |> get_game
    |> Game.changeset(%{state: to_string(fsm.state), duration_in_seconds: duration})
    |> Repo.update!()

    Repo.insert!(%UserGame{
      game_id: game_id,
      user_id: loser.id,
      result: "gave_up",
      creator: loser.creator
    })

    Repo.insert!(%UserGame{
      game_id: game_id,
      user_id: winner.id,
      result: "won",
      creator: winner.creator
    })

    if loser.id != 0 do
      loser
      |> User.changeset(%{rating: loser_rating})
      |> Repo.update!()
    end

    if winner.id != 0 do
      winner
      |> User.changeset(%{rating: winner_rating})
      |> Repo.update!()
    end

    ActiveGames.terminate_game(game_id)
  end

  defp get_random_task(level, user_ids) do
    qry = """
    WITH game_tasks AS (SELECT count(games.id) as count, games.task_id FROM games
    INNER JOIN "user_games" ON "user_games"."game_id" = "games"."id"
    WHERE "games"."task_level" = $1 AND "user_games"."user_id" IN ($2, $3)
    GROUP BY "games"."task_id")

    SELECT "tasks".*, "game_tasks".* FROM tasks
    LEFT JOIN game_tasks ON "tasks"."id" = "game_tasks"."task_id"
    WHERE "tasks"."level" = $1
    ORDER BY "game_tasks"."count" NULLS FIRST
    LIMIT 1
    """

    res = Ecto.Adapters.SQL.query!(Repo, qry, [level, Enum.at(user_ids, 0), Enum.at(user_ids, 1)])

    cols = Enum.map(res.columns, &String.to_atom(&1))

    tasks =
      Enum.map(res.rows, fn row ->
        struct(Codebattle.Task, Enum.zip(cols, row))
      end)

    List.first(tasks)
  end
end
