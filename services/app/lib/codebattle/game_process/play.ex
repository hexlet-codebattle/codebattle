defmodule Codebattle.GameProcess.Play do
  require Logger

  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false
  import Codebattle.GameProcess.Auth

  alias Codebattle.{Repo, Game, User, UserGame}

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Engine,
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

  # get data interface
  def active_games do
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
      type: FsmHelpers.get_type(fsm),
      timeout_seconds: FsmHelpers.get_timeout_seconds(fsm),
      rematch_state: FsmHelpers.get_rematch_state(fsm),
      rematch_initiator_id: FsmHelpers.get_rematch_initiator_id(fsm),
      joins_at: FsmHelpers.get_joins_at(fsm)
    }
  end

  def completed_games do
    query =
      from(
        games in Game,
        order_by: [desc: games.updated_at],
        where: [state: "game_over"],
        limit: 25,
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

  # main api interface
  def create_game(user, game_params) do
    player = Player.build(user, %{creator: true})
    engine = get_engine(:standard)

    case player_can_create_game?(player) do
      :ok ->
        {:ok, fsm} = engine.create_game(player, game_params)

        Task.async(fn ->
          CodebattleWeb.Endpoint.broadcast!("lobby", "game:new", %{
            game: FsmHelpers.lobby_format(fsm)
          })
        end)

        {:ok, FsmHelpers.get_game_id(fsm)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def create_bot_game(bot, game_params) do
    engine = get_engine(:bot)

    case player_can_create_game?(bot) do
      :ok ->
        {:ok, fsm} = engine.create_game(bot, game_params)
        {:ok, FsmHelpers.get_game_id(fsm)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def create_rematch_game_with_bot(game_id) do
    fsm = Play.get_fsm(game_id)
    engine = get_engine(fsm)
    real_player = FsmHelpers.get_second_player(fsm) |> Player.rebuild()
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    game_params = %{"level" => level, "type" => type, "timeout_seconds" => timeout_seconds}

    bot = Codebattle.Bot.Builder.build_free_bot()

    if bot === nil do
      {:no_free_bot}
    else
      case create_bot_game(bot, game_params) do
        {:ok, new_game_id} ->
          {:ok, new_fsm} = engine.join_game(new_game_id, real_player)

          start_timeout_timer(new_game_id, new_fsm)

          Task.async(fn ->
            CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{
              game: FsmHelpers.lobby_format(new_fsm)
            })
          end)

          {:new_game, new_game_id}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  def rematch_send_offer(game_id, user_id) do
    fsm = get_fsm(game_id)

    if FsmHelpers.bot_game?(fsm) do
      create_rematch_game_with_bot(game_id)
    else
      {_response, new_fsm} =
        Server.call_transition(game_id, :rematch_send_offer, %{player_id: user_id})

      rematch_data = %{
        rematchState: new_fsm.data.rematch_state,
        rematchInitiatorId: new_fsm.data.rematch_initiator_id
      }

      {:rematch_offer, rematch_data}
    end
  end

  def create_rematch_game(game_id) do
    ActiveGames.terminate_game(game_id)

    fsm = Play.get_fsm(game_id)
    first_player = FsmHelpers.get_first_player(fsm) |> Player.rebuild()
    second_player = FsmHelpers.get_second_player(fsm) |> Player.rebuild()
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    game_params = %{"level" => level, "type" => type, "timeout_seconds" => timeout_seconds}

    engine = get_engine(fsm)
    {:ok, new_fsm} = engine.create_game(first_player, game_params)
    new_game_id = FsmHelpers.get_game_id(new_fsm)
    {:ok, new_fsm} = engine.join_game(new_game_id, second_player)

    start_timeout_timer(new_game_id, new_fsm)

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{
        game: FsmHelpers.lobby_format(new_fsm)
      })
    end)

    {:ok, new_game_id}
  end

  def rematch_reject(game_id) do
    fsm = get_fsm(game_id)
    {_response, new_fsm} = Server.call_transition(game_id, :rematch_reject, %{})
    {:ok, new_fsm}
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
              CodebattleWeb.Endpoint.broadcast!("lobby", "game:update", %{
                game: FsmHelpers.lobby_format(fsm)
              })
            end)

            start_timeout_timer(id, fsm)

            {:ok, fsm}

          {:error, reason} ->
            {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def timeout_game(id) do
    if ActiveGames.game_exists?(id) do
      Logger.info("Timeout triggered for game_id: #{id}")
      Server.call_transition(id, :timeout, %{})
      ActiveGames.terminate_game(id)
      CodebattleWeb.Notifications.game_timeout(id)
      CodebattleWeb.Notifications.lobby_game_cancel(id)

      id
      |> get_game
      |> Game.changeset(%{state: "timeout"})
      |> Repo.update!()

      :ok
    else
      :error
    end
  end

  def cancel_game(id, user) do
    fsm = get_fsm(id)
    player = FsmHelpers.get_player(fsm, user.id)

    case player_can_cancel_game?(id, player) do
      :ok ->
        ActiveGames.terminate_game(id)
        GlobalSupervisor.terminate_game(id)
        CodebattleWeb.Notifications.lobby_game_cancel(id)

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
        :ok

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
          {:waiting_opponent, {:ok, result, output}} ->
            {:error, result, output}

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

  defp start_timeout_timer(id, fsm) do
    if fsm.data.timeout_seconds > 0 do
      Codebattle.GameProcess.TimeoutServer.restart(
        id,
        fsm.data.timeout_seconds
      )
    end
  end
end
