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
    Engine,
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

  # get data interface
  def list_games do
    ActiveGames.list_games()
  end

  def game_info(id) do
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
  end

  def get_game(id) do
    query = from(g in Game, preload: [:users, :user_games])
    Repo.get(query, id)
  end

  def get_fsm(id) do
    Server.fsm(id)
  end

  # Enum.map(games, fn game ->
  #   winner_user_game =
  #     game.user_games
  #     |> Enum.filter(fn user_game -> user_game.result == "won" end)
  #     |> List.first()

  #   winner =
  #     case winner_user_game do
  #       nil ->
  #         Codebattle.Bot.Builder.build(%{game_result: :won})

  #       winner_user_game ->
  #         Map.get(winner_user_game, :user)
  #         |> Map.merge(%{
  #           creator: winner_user_game.creator,
  #           game_result: winner_user_game.result,
  #           lang: winner_user_game.lang,
  #           rating: winner_user_game.rating,
  #           rating_diff: winner_user_game.rating_diff
  #         })
  #     end

  #   loser_user_game =
  #     game.user_games
  #     |> Enum.filter(fn user_game -> user_game.result != "won" end)
  #     |> List.first()

  #   loser =
  #     case loser_user_game do
  #       nil ->
  #         Codebattle.Bot.Builder.build()

  #       loser_user_game ->
  #         Map.get(loser_user_game, :user)
  #         |> Map.merge(%{
  #           creator: loser_user_game.creator,
  #           game_result: loser_user_game.result,
  #           lang: loser_user_game.lang,
  #           rating: loser_user_game.rating,
  #           rating_diff: loser_user_game.rating_diff
  #         })
  #     end

  #   %{updated_at: updated_at} = game

  #   players =
  #     [winner, loser]
  #     |> Enum.sort(&(&1.creator > &2.creator))

  #   %{
  #     id: game.id,
  #     players: players,
  #     updated_at: updated_at,
  #     duration: game.duration_in_seconds,
  #     level: game.level
  #   }
  # end)
  # end

  # main api interface
  def create_game(user, game_params) do
    player = Player.build(user, %{creator: true})
    engine = get_engine(:standard)

    case player_can_create_game?(player) do
      :ok ->
        engine.create_game(player, game_params)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def create_bot_game(bot, game_params) do
    engine = get_engine(:bot)

    case player_can_create_game?(bot) do
      :ok ->
        engine.create_game(bot, game_params)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(id, user) do
    fsm = get_fsm(id)
    player = Player.build(user)
    engine = get_engine(fsm)

    case player_can_join_game?(player) do
      :ok ->
        case engine.join_game(id, player) do
          {:ok, fsm} ->
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

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(id, user) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)

    case player_can_cancel_game?(id, player) do
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

  def update_editor_data(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)
    engine = get_engine(fsm)

    case player_can_update_editor_data?(id, player) do
      :ok ->
        update_editor(id, engine, player, editor_text, editor_lang)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def give_up(id, user) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)

    case player_can_give_up?(id, player) do
      :ok ->
        engine = get_engine(fsm)
        {_response, fsm} = Server.call_transition(id, :give_up, %{id: player.id})
        engine.handle_give_up(id, player, fsm)
        {:ok, fsm}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def check_game(id, user, editor_text, editor_lang) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)

    case player_can_check_game?(id, player) do
      :ok ->
        engine = get_engine(fsm)

        update_editor(id, engine, player, editor_text, editor_lang)

        check_result = Checker.check(FsmHelpers.get_task(fsm), editor_text, editor_lang)

        case {fsm.state, check_result} do
          {:playing, {:ok, result, output}} ->
            {_response, fsm} = Server.call_transition(id, :complete, %{id: player.id})
            engine.handle_won_game(id, player, fsm)
            {:ok, fsm, result, output}

          {:game_over, {:ok, result, output}} ->
            {:ok, result, output}

          {_, {:error, result, output}} ->
            {:error, result, output}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  # stuff

  defp player_can_create_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  defp player_can_join_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  defp player_can_cancel_game?(id, player) do
    case ActiveGames.participant?(id, player.id, :waiting_opponent) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  defp player_can_give_up?(id, player) do
    case ActiveGames.participant?(id, player.id,  :playing) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  defp player_can_check_game?(id, player) do
    case ActiveGames.participant?(id, player.id) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  defp player_can_update_editor_data?(id, player) do
    case ActiveGames.participant?(id, player.id) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  defp get_engine(:standard), do: Engine.Standard
  defp get_engine(:bot), do: Engine.Bot

  defp get_engine(fsm) do
    case FsmHelpers.bot_game?(fsm) do
      true ->
        Engine.Bot

      _ ->
        Engine.Standard
    end
  end

  defp update_editor(id, engine, player, editor_text, editor_lang) do
    %{editor_text: prev_text, editor_lang: prev_lang} = player

    is_text_changed = editor_text != prev_text
    is_lang_changed = editor_lang != prev_lang

    if is_text_changed do
      engine.update_text(id, player, editor_text)
    end

    if is_lang_changed do
      engine.update_lang(id, player, editor_lang)
    end
  end
end
