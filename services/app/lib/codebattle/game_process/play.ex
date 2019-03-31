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

  def create_game(user, game_params, engine_type \\ :standard) do
    player = Player.from_user(user, %{creator: true})
    engine = get_engine(engine_type)

    case player_can_create_game?(player) do
      :ok ->
        engine.create_game(player, game_params)

      {:error, reason} ->
        {:error, reason}
    end
  end

  # TODO: refactor to join_to_bot_game and join_game
  def join_game(id, user) do
    player = Player.from_user(user)
    engine = get_engine(fsm)

    case player_can_join_game?(player) do
      :ok ->
        {:ok, fsm} = engine.join_game(id, player)

        Task.async(fn ->
          CodebattleWeb.Endpoint.broadcast("lobby", "game:update", %{
            game: fsm,
            game_info: game_info(id)
          })
        end)

        {:ok, fsm}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(id, user) do
    player = Player.from_user(user)
    engine = get_engine(fsm)

    case player_can_cancel_game?(player, fsm) do
      :ok ->
        ActiveGames.terminate_game(id)
        GlobalSupervisor.terminate_game(id)
        CodebattleWeb.Endpoint.broadcast("lobby", "game:cancel", %{game_id: id})

        id
        |> get_game
        |> Game.changeset(%{state: "canceled"})
        |> Repo.update!()

        :ok

      {:error, _reason} ->
        {:error, _reason}
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

  def update_editor_data(id, user, editor_text, editor_lang) do
    player = FsmHelpers.get_player(fsm, user.id)

    %{editor_text: prev_text, editor_lang: prev_lang} = player

    is_text_changed = editor_text == prev_text
    is_lang_changed = editor_lang == prev_lang

    # text
    case is_text_changed do
      true ->
        RecorderServer.update_text(id, player.id, editor_text)

        Server.call_transition(id, :update_editor_params, %{
          id: player.id,
          editor_text: editor_text
        })

      _ ->
        nil
    end

    # lang
    case is_lang_changed do
      true ->
        RecorderServer.update_lang(id, player.id, editor_lang)

        Server.call_transition(id, :update_editor_params, %{
          id: player.id,
          editor_lang: editor_lang
        })

        update_user(user, %{lang: editor_lang})

      _ ->
        nil
    end
  end

  def give_up(id, user) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)
    engine = get_engine(fsm)
    {_response, fsm} = Server.call_transition(id, :give_up, %{id: player.id})
    engine.gave_up(id, player, fsm)
    fsm
  end

  def check_game(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    player = Player.from_user(user)
    engine = get_engine(fsm)

    update_editor_data(id, player, editor_text, editor_lang)
    check = check_code(FsmHelpers.get_task(fsm), editor_text, editor_lang)

    case {fsm.state, check} do
      {:playing, {:ok, result, output}} ->
        {_response, fsm} = Server.call_transition(id, :complete, %{id: player.id})
        engine.handle_won_game(id, player, fsm)
        {:ok, fsm, result, output}

      {_, {:error, result, output}} ->
        {:error, result, output}

      {:game_over, {:ok, result, output}} ->
        {:ok, result, output}
    end
  end

  defp check_code(task, editor_text, editor_lang) do
    Checker.check(task, editor_text, editor_lang)
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
    loser_player = Player.from_user(fsm, loser.id).id
    winner_id = FsmHelpers.get_opponent(fsm, loser.id).id

    # winner =
    #   case FsmHelpers.bot_game?(fsm) do
    #     true ->
    #       FsmHelpers.get_first_player(fsm)

    #     false ->
    #       Repo.get(User, winner_id)
    #   end

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

  def player_can_create_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def player_can_join_game?(player) do
    case ActiveGames.playing?(user.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def player_can_cancel_game?(id, player) do
    case ActiveGames.participant?(id, player.id) do
      :ok ->
        :ok

      {:error, _reason} ->
        {:error, _reason}
    end
  end
end
