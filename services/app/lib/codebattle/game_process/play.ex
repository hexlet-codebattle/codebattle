defmodule Codebattle.GameProcess.Play do
  require Logger

  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game, User, UserGame}
  alias Codebattle.User.Achievements

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Fsm,
    Play,
    Player,
    FsmHelpers,
    Elo,
    ActiveGames,
    Notifier
  }

  alias Codebattle.CodeCheck.Checker
  alias Codebattle.Bot.RecorderServer
  alias Codebattle.Bot.PlaybookPlayerRunner

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
        case winner_user_game do
          nil ->
            Codebattle.Bot.Builder.build(%{game_result: :won})

          winner_user_game ->
            Map.get(winner_user_game, :user)
            |> Map.merge(%{
              creator: winner_user_game.creator,
              game_result: winner_user_game.result,
              lang: winner_user_game.lang,
              rating: winner_user_game.rating,
              rating_diff: winner_user_game.rating_diff
            })
        end

      loser_user_game =
        game.user_games
        |> Enum.filter(fn user_game -> user_game.result != "won" end)
        |> List.first()

      loser =
        case loser_user_game do
          nil ->
            Codebattle.Bot.Builder.build()

          loser_user_game ->
            Map.get(loser_user_game, :user)
            |> Map.merge(%{
              creator: loser_user_game.creator,
              game_result: loser_user_game.result,
              lang: loser_user_game.lang,
              rating: loser_user_game.rating,
              rating_diff: loser_user_game.rating_diff
            })
        end

      %{updated_at: updated_at} = game

      players =
        [winner, loser]
        |> Enum.sort(&(&1.creator > &2.creator))

      %{
        id: game.id,
        players: players,
        updated_at: updated_at,
        duration: game.duration_in_seconds,
        level: game.level
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

  def create_game(user, level, type \\ "public") do
    case ActiveGames.playing?(user.id) do
      false ->
        player = Player.from_user(user, %{creator: true})

        game =
          Repo.insert!(%Game{
            state: "waiting_opponent",
            users: [user],
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

        ActiveGames.create_game(user, fsm)
        {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

        Task.async(fn ->
          CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: fsm})
        end)

        # TODO: сделать настройку нотификаций в списке игр
        # FIXME: please refactor this, don't broadcast notificate if the game is a private
        case type do
          "public" ->
            Task.async(fn ->
              Notifier.call(:game_created, %{level: level, game: game, player: player})
            end)

          _ ->
            nil
        end

        {:ok, game.id}

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def create_bot_game(bot, task) do
    player = Player.from_user(bot, %{creator: true})

    game =
      Repo.insert!(%Game{state: "waiting_opponent", users: [bot], level: task.level, task: task})

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        player: player,
        game_id: game.id,
        level: task.level,
        task: task,
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

  def create_rematch_game(game_id) do
    ActiveGames.terminate_game(game_id)
    fsm = Play.get_fsm(game_id)
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    players = FsmHelpers.get_players(fsm)
    task = get_random_task(level, players)

    game =
      Repo.insert!(%Game{state: "waiting_opponent", users: players, level: level, task: task})


    # TODO
    ActiveGames.create_game(players[0], fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    fsm =
      Fsm.new()
      |> Fsm.create_rematch(%{
        players: players,
        game_id: game.id,
        level: level,
        type: type,
        task: task,
        starts_at: TimeHelper.utc_now()
      })

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: fsm})
    end)

    {:ok, game.id}
  end

  # TODO: refactor to join_to_bot_game and join_game
  def join_game(id, user) do
    if ActiveGames.playing?(user.id) do
      :error
    else
      game = get_game(id)
      fsm = get_fsm(id)
      first_player = FsmHelpers.get_first_player(fsm)

      if FsmHelpers.bot_game?(fsm) == true do
        game
        |> Game.changeset(%{state: "playing"})
        |> Repo.update!()

        player = Player.from_user(user)

        case Server.call_transition(id, :join, %{
               player: player,
               starts_at: TimeHelper.utc_now()
             }) do
          {:ok, fsm} ->
            ActiveGames.add_participant(fsm)

            {:ok, _} =
              Codebattle.Bot.Supervisor.start_bot_server(
                id,
                FsmHelpers.get_second_player(fsm),
                fsm
              )

            Codebattle.Bot.PlaybookAsyncRunner.call(%{
              game_id: id,
              task_id: FsmHelpers.get_task(fsm).id
            })

            {:ok, fsm}

          {{:error, _reason}, _} ->
            :error
        end
      else
        task = get_random_task(game.level, [user, first_player])

        player = Player.from_user(user)

        case Server.call_transition(id, :join, %{
               player: player,
               starts_at: TimeHelper.utc_now(),
               task: task
             }) do
          {:ok, fsm} ->
            ActiveGames.add_participant(fsm)

            game
            |> Game.changeset(%{state: "playing", task_id: task.id})
            |> Repo.update!()

            {:ok, _} =
              Codebattle.Bot.Supervisor.start_bot_server(
                id,
                first_player,
                fsm
              )

            {:ok, _} =
              Codebattle.Bot.Supervisor.start_bot_server(
                id,
                FsmHelpers.get_second_player(fsm),
                fsm
              )

            Notifier.call(:game_opponent_join, %{
              # creator: FsmHelpers.get_opponent(fsm, user.id),
              first_player: first_player,
              second_player: FsmHelpers.get_second_player(fsm),
              game_id: id
            })

            {:ok, fsm}

          {{:error, _reason}, _} ->
            :error
        end
      end
    end
  end

  def cancel_game(id, user) do
    if ActiveGames.participant?(id, user.id) do
      ActiveGames.terminate_game(id)
      GlobalSupervisor.terminate_game(id)

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
      starts_at: FsmHelpers.get_starts_at(fsm),
      players: FsmHelpers.get_players(fsm),
      task: FsmHelpers.get_task(fsm),
      level: FsmHelpers.get_level(fsm),
      type: FsmHelpers.get_type(fsm)
    }
  end

  def update_editor_data(id, player_id, editor_text, editor_lang) do
    fsm = get_fsm(id)

    %{editor_text: prev_editor_text, editor_lang: prev_editor_lang} =
      FsmHelpers.get_player(fsm, player_id)

    # text
    RecorderServer.update_text(id, player_id, editor_text)
    Server.call_transition(id, :update_editor_params, %{id: player_id, editor_text: editor_text})

    # land
    case editor_lang do
      ^prev_editor_lang ->
        :ok

      _ ->
        case Repo.get(User, player_id) do
          user ->
            user |> Ecto.Changeset.change(%{lang: editor_lang}) |> Repo.update!()

          nil ->
            nil
        end

        RecorderServer.update_lang(id, player_id, editor_lang)

        Server.call_transition(id, :update_editor_params, %{
          id: player_id,
          editor_lang: editor_lang
        })
    end
  end

  def give_up(id, user) do
    # TODO: terminate Bot.RecordServer for this
    # RecorderServer.update_lang(id, user_id, editor_lang)
    {_response, fsm} = Server.call_transition(id, :give_up, %{id: user.id})
    handle_gave_up(id, user, fsm)
    fsm
  end

  def check_game(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    update_editor_data(id, user.id, editor_text, editor_lang)
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
    :ok = RecorderServer.store(id, winner.id)
    game_id = id |> Integer.parse() |> elem(0)
    loser_id = FsmHelpers.get_opponent(fsm, winner.id).id

    loser =
      try do
        Repo.get(User, loser_id)
      rescue
        _ -> Codebattle.Bot.Builder.build()
      end

    difficulty = fsm.data.level

    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, difficulty)
    winner_rating_diff = winner_rating - winner.rating
    loser_rating_diff = loser_rating - loser.rating

    duration = NaiveDateTime.diff(TimeHelper.utc_now(), FsmHelpers.get_starts_at(fsm))

    game_id
    |> get_game
    |> Game.changeset(%{state: to_string(fsm.state), duration_in_seconds: duration})
    |> Repo.update!()

    # TODO: fix creator please!!!!!

    if !winner.bot do
      Repo.insert!(%UserGame{
        game_id: game_id,
        user_id: winner.id,
        result: "won",
        creator: winner.creator,
        rating: winner_rating,
        rating_diff: winner_rating_diff,
        lang: Map.get(winner, :lang, nil)
      })
    end

    if !loser.bot do
      Repo.insert!(%UserGame{
        game_id: game_id,
        user_id: loser.id,
        result: "lost",
        creator: loser.creator,
        rating: loser_rating,
        rating_diff: loser_rating_diff,
        lang: Map.get(loser, :lang, nil)
      })
    end

    if !winner.bot do
      winner_achievements = Achievements.recalculate_achievements(winner)

      winner
      |> User.changeset(%{rating: winner_rating, achievements: winner_achievements})
      |> Repo.update!()
    end

    if !loser.bot do
      loser_achievements = Achievements.recalculate_achievements(loser)

      loser
      |> User.changeset(%{rating: loser_rating, achievements: loser_achievements})
      |> Repo.update!()
    end

    ActiveGames.terminate_game(game_id)
  end

  defp handle_gave_up(id, loser, fsm) do
    game_id = id |> Integer.parse() |> elem(0)
    winner_id = FsmHelpers.get_opponent(fsm, loser.id).id

    winner =
      case FsmHelpers.bot_game?(fsm) do
        true ->
          FsmHelpers.get_first_player(fsm)

        false ->
          Repo.get(User, winner_id)
      end

    difficulty = fsm.data.level

    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, difficulty)
    winner_rating_diff = winner_rating - winner.rating
    loser_rating_diff = loser_rating - loser.rating

    duration = NaiveDateTime.diff(TimeHelper.utc_now(), FsmHelpers.get_starts_at(fsm))

    game_id
    |> get_game
    |> Game.changeset(%{state: to_string(fsm.state), duration_in_seconds: duration})
    |> Repo.update!()

    if !loser.bot do
      Repo.insert!(%UserGame{
        game_id: game_id,
        user_id: loser.id,
        result: "gave_up",
        creator: loser.creator,
        rating: loser_rating,
        rating_diff: loser_rating_diff,
        lang: Map.get(loser, :lang, nil)
      })
    end

    if !winner.bot do
      Repo.insert!(%UserGame{
        game_id: game_id,
        user_id: winner.id,
        result: "won",
        creator: winner.creator,
        rating: winner_rating,
        rating_diff: winner_rating_diff,
        lang: Map.get(winner, :lang, nil)
      })
    end

    if loser.bot == false do
      loser_achievements = Achievements.recalculate_achievements(loser)

      loser
      |> User.changeset(%{rating: loser_rating, achievements: loser_achievements})
      |> Repo.update!()
    end

    if winner.bot == false do
      winner_achievements = Achievements.recalculate_achievements(winner)

      winner
      |> User.changeset(%{rating: winner_rating, achievements: winner_achievements})
      |> Repo.update!()
    end

    ActiveGames.terminate_game(game_id)
  end

  defp get_random_task(level, players) do
    qry = """
    WITH game_tasks AS (SELECT count(games.id) as count, games.task_id FROM games
    INNER JOIN "user_games" ON "user_games"."game_id" = "games"."id"
    WHERE "games"."level" = $1 AND "user_games"."user_id" IN ($2, $3)
    GROUP BY "games"."task_id")
    SELECT "tasks".*, "game_tasks".* FROM tasks
    LEFT JOIN game_tasks ON "tasks"."id" = "game_tasks"."task_id"
    WHERE "tasks"."level" = $1
    ORDER BY "game_tasks"."count" NULLS FIRST
    LIMIT 7
    """

    # TODO: get list and then get random in elixir

    res =
      Ecto.Adapters.SQL.query!(Repo, qry, [
        level,
        Enum.at(players, 0).id,
        Enum.at(players, 1).id
      ])

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
