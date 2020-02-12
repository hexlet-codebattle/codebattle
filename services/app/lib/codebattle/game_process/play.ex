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
    FsmHelpers,
    ActiveGames
  }

  alias CodebattleWeb.Notifications

  def active_games do
    ActiveGames.list_games()
  end

  def active_games(params) do
    ActiveGames.list_games(params)
  end

  def game_info(id) do
    case get_fsm(id) do
      {:ok, fsm} ->
        {:ok,
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
         }}

      {:error, reason} ->
        {:error, reason}
    end
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

  def create_game(
        user,
        game_params,
        engine_type \\ :standard,
        default_timeout \\ Application.get_env(:codebattle, :default_timeout)
      ) do
    player = Player.build(user, %{creator: true})
    engine = get_engine(engine_type)

    case engine.create_game(player, game_params) do
      {:ok, fsm} ->
        game_id = FsmHelpers.get_game_id(fsm)
        Codebattle.GameProcess.TimeoutServer.restart(game_id, default_timeout)

        {:ok, game_id}

      {:error, reason} ->
        {:error, reason}
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
    case get_fsm(game_id) do
      {:ok, fsm} ->
        engine = get_engine(fsm)
        engine.handle_rematch_offer_send(fsm, user_id)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def rematch_accept_offer(game_id) do
    case get_fsm(game_id) do
      {:ok, fsm} ->
        engine = get_engine(fsm)
        engine.handle_accept_offer(fsm)

      {:error, reason} ->
        {:error, reason}
    end
  end

  def rematch_reject(game_id) do
    {_response, new_fsm} = Server.call_transition(game_id, :rematch_reject, %{})
    {:ok, new_fsm}
  end

  def join_game(id, user) do
    with {:ok, fsm} <- get_fsm(id),
         %Player{} = player <- Player.build(user),
         :ok <- player_can_join_game?(player) do
      engine = get_engine(fsm)
      engine.join_game(id, player)
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def timeout_game(id) do
    if ActiveGames.game_exists?(id) do
      Logger.info("Timeout triggered for game_id: #{id}")
      Server.call_transition(id, :timeout, %{})
      ActiveGames.terminate_game(id)
      Notifications.game_timeout(id)
      Notifications.lobby_game_cancel(id)
      {:ok, fsm} = get_fsm(id)
      Notifications.notify_tournament(:game_over, fsm, %{game_id: id, state: "canceled"})

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
    with {:ok, fsm} <- get_fsm(id),
         %Player{} = player <- FsmHelpers.get_player(fsm, user.id),
         :ok <- player_can_cancel_game?(id, player) do
      ActiveGames.terminate_game(id)
      GlobalSupervisor.terminate_game(id)
      Notifications.lobby_game_cancel(id)

      id
      |> get_game
      |> Game.changeset(%{state: "canceled"})
      |> Repo.update!()

      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def update_editor_data(id, user, editor_text, editor_lang) do
    with {:ok, fsm} <- get_fsm(id),
         %Player{} = player <- FsmHelpers.get_player(fsm, user.id),
         :ok <- player_can_update_editor_data?(id, player) do
      engine = get_engine(fsm)
      update_editor(id, engine, player, editor_text, editor_lang)
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def give_up(id, user) do
    with {:ok, fsm} <- get_fsm(id),
         %Player{} = player <- FsmHelpers.get_player(fsm, user.id),
         :ok <- player_can_give_up?(id, player),
         {_response, fsm} <- Server.call_transition(id, :give_up, %{id: player.id}) do
      engine = get_engine(fsm)

      Server.update_playbook(
        id,
        :give_up,
        %{id: user.id}
      )

      engine.handle_give_up(id, player, fsm)
      {:ok, fsm}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def check_game(id, user, editor_text, editor_lang) do
    with {:ok, fsm} <- get_fsm(id),
         %Player{} = player <- FsmHelpers.get_player(fsm, user.id),
         :ok <- player_can_check_game?(id, player) do
      engine = get_engine(fsm)

      Server.update_playbook(
        id,
        :start_check,
        %{id: user.id, editor_text: editor_text, editor_lang: editor_lang}
      )

      update_editor(id, engine, player, editor_text, editor_lang)

      check_result = checker_adapter().call(FsmHelpers.get_task(fsm), editor_text, editor_lang)

      Server.call_transition(id, :update_editor_params, %{
        id: player.id,
        result: check_result.result,
        output: check_result.output
      })

      case {fsm.state, check_result} do
        {:waiting_opponent, %{status: :ok}} ->
          %{check_result | status: :error}

        {:playing, %{status: :ok}} ->
          {_response, fsm} =
            Server.call_transition(id, :complete, %{id: player.id, lang: editor_lang})

          case engine.handle_won_game(id, player, fsm, editor_text) do
            :ok -> %{check_result | status: :game_won}
            :copypaste -> %{check_result | status: :copypaste}
          end

        _ ->
          check_result
      end
    else
      {:error, reason} -> {:error, reason}
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

  defp checker_adapter do
    Application.get_env(:codebattle, :checker_adapter)
  end
end
