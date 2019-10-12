defmodule Codebattle.GameProcess.Play do
  require Logger

  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false
  import Codebattle.GameProcess.Auth

  alias Codebattle.{Repo, Game}

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Engine,
    Player,
    Fsm,
    FsmHelpers,
    ActiveGames
  }

  alias Codebattle.CodeCheck.Checker
  alias CodebattleWeb.Notifications

  # get data interface
  def active_games do
    ActiveGames.list_games()
  end

  def active_games(params) do
    ActiveGames.list_games(params)
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
      tournament_id: FsmHelpers.get_tournament_id(fsm),
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

    Repo.all(query)
  end

  def get_completed_game_info(game) do
    winner_user_game =
      game.user_games
      |> Enum.filter(fn user_game -> user_game.result == "won" end)
      |> List.first()

    loser_user_game =
      game.user_games
      |> Enum.filter(fn user_game -> user_game.result != "won" end)
      |> List.first()

    winner = Player.build(winner_user_game)
    loser = Player.build(loser_user_game)

    players =
      [winner, loser]
      |> Enum.sort(&(&1.creator > &2.creator))

    %{
      id: game.id,
      players: players,
      updated_at: game.updated_at,
      duration: game.duration_in_seconds,
      level: game.level
    }
  end

  def get_game(id) do
    query = from(g in Game, preload: [:users, :user_games])
    Repo.get(query, id)
  end

  def get_fsm(id) do
    Server.fsm(id)
  end

  # main api interface

  def create_game(user, game_params, engine_type \\ :standard) do
    player = Player.build(user, %{creator: true})
    engine = get_engine(engine_type)

    case engine.create_game(player, game_params) do
      {:ok, fsm} -> {:ok, FsmHelpers.get_game_id(fsm)}
      {:error, reason} -> {:error, reason}
    end
  end

  def create_tournament_game(tournament, players, timeout_seconds) do
    engine = get_engine(:tournament)

    {:ok, fsm} =
      engine.create_game(players, %{
        tournament_id: tournament.id,
        timeout_seconds: timeout_seconds
      })

    {:ok, FsmHelpers.get_game_id(fsm)}
  end

  def rematch_send_offer(game_id, user_id) do
    fsm = get_fsm(game_id)
    engine = get_engine(fsm)
    engine.handle_rematch_offer_send(fsm, user_id)
  end

  def rematch_accept_offer(game_id) do
    fsm = get_fsm(game_id)
    engine = get_engine(fsm)
    engine.handle_accept_offer(fsm)
  end

  def rematch_reject(game_id) do
    {_response, new_fsm} = Server.call_transition(game_id, :rematch_reject, %{})
    {:ok, new_fsm}
  end

  def join_game(id, user) do
    with %Fsm{} = fsm <- get_fsm(id),
         %Player{} = player <- Player.build(user),
         :ok <- player_can_join_game?(player) do
      engine = get_engine(fsm)
      engine.join_game(id, player)
    else
      {:error, reason} -> {:error, reason}
      result -> {:error, result}
    end
  end

  def timeout_game(id) do
    if ActiveGames.game_exists?(id) do
      Logger.info("Timeout triggered for game_id: #{id}")
      Server.call_transition(id, :timeout, %{})
      ActiveGames.terminate_game(id)
      Notifications.game_timeout(id)
      Notifications.lobby_game_cancel(id)
      Notifications.notify_tournament("game:cancel", get_fsm(id), %{game_id: id})

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
        Notifications.lobby_game_cancel(id)

        id
        |> get_game
        |> Game.changeset(%{state: "canceled"})
        |> Repo.update!()

        :ok

      {:error, reason} ->
        {:error, reason}
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

            case engine.handle_won_game(id, player, fsm, editor_text) do
              :ok -> {:ok, fsm, result, output}
              :copypaste -> {:copypaste, result, output}
            end

          {_, result} ->
            result
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp get_engine(:standard), do: Engine.Standard
  defp get_engine(:bot), do: Engine.Bot
  defp get_engine(:tournament), do: Engine.Tournament

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
