defmodule Codebattle.Game.Engine do
  alias Codebattle.Game

  alias Codebattle.Game.{
    Player,
    Server,
    Helpers,
    LiveGames,
    Elo,
    GlobalSupervisor
  }

  alias Codebattle.Languages
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.Game
  alias Codebattle.UserGame
  alias Codebattle.User.Achievements
  alias CodebattleWeb.Api.GameView
  alias Codebattle.Bot.Playbook

  import Codebattle.Game.Auth

  require Logger

  @default_timeout 30 * 60
  @max_timeout 2 * 60 * 60

  def create_game(params) do
    level = params[:level] || get_random_level()
    task = params[:task] || get_task(level)
    state = params[:state] || get_state_from_params(params)
    type = params[:type] || "standard"
    visibility_type = params[:visibility_type] || "public"
    timeout_seconds = params[:timeout_seconds] || @default_timeout
    [creator | _] = params.players

    players =
      Enum.map(params.players, fn player ->
        Player.build(player, %{creator: player.id == creator.id, task: task})
      end)

    with :ok <- can_play_game?(players),
         langs <- Languages.get_langs_with_solutions(task),
         {:ok, game} <-
           insert_game(%{
             state: state,
             level: level,
             type: type,
             visibility_type: visibility_type,
             timeout_seconds: min(timeout_seconds, @max_timeout),
             tournament_id: params[:tournament_id],
             task: task,
             players: players
           }),
         game <- Map.merge(game, %{langs: langs}),
         {:ok, _} <- GlobalSupervisor.start_game(game),
         :ok <- insert_live_game(game),
         :ok <- start_timeout_timer(game),
         :ok <- broadcast_live_game(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(game, user) do
    with :ok <- can_play_game?(user),
         {:ok, {_old_game, game}} <-
           Server.call_transition(game.id, :join, %{
             players: game.players ++ [Player.build(user, %{task: game.task})],
             starts_at: TimeHelper.utc_now()
           }),
         :ok <- LiveGames.update_game(game),
         game <- update_game!(game, %{state: "playing"}),
         :ok <- broadcast_live_game(game),
         :ok <- start_timeout_timer(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def check_result(game, params) do
    %{user: user, editor_text: editor_text, editor_lang: editor_lang} = params

    Server.update_playbook(game.id, :start_check, %{
      id: user.id,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    check_result = checker_adapter().call(game.task, editor_text, editor_lang)

    case check_result.status do
      "ok" ->
        {:ok, {old_game, new_game}} =
          Server.call_transition(game.id, :check_success, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        case {old_game.state, new_game.state} do
          {"playing", "game_over"} ->
            Server.update_playbook(game.id, :game_over, %{id: user.id, lang: editor_lang})

            player = Helpers.get_player(new_game, user.id)
            handle_won_game(new_game, player)
            {:ok, new_game, %{check_result: check_result, solution_status: true}}

          _ ->
            {:ok, new_game, %{check_result: check_result, solution_status: false}}
        end

      _ ->
        {:ok, {_old_game, new_game}} =
          Server.call_transition(game.id, :check_failure, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        {:ok, new_game, %{check_result: check_result, solution_status: false}}
    end
  end

  def give_up(game, user) do
    case Server.call_transition(game.id, :give_up, %{id: user.id}) do
      {:ok, {_old_game, game}} ->
        handle_give_up(game, user.id)

        {:ok, game}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(game, user) do
    with %Player{} = player <- Helpers.get_player(game, user.id),
         :ok <- player_can_cancel_game?(game.id, player),
         :ok <- terminate_game(game),
         %Game{} = _game <- update_game!(game, %{state: "canceled"}) do
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def terminate_game(%Game{} = game) do
    case game.is_live do
      true ->
        # Engine.store_playbook(game)
        LiveGames.delete_game(game.id)
        GlobalSupervisor.terminate_game(game.id)
        :ok

      _ ->
        :ok
    end
  end

  def rematch_send_offer(game, user) do
    {:ok, {_old_game, game}} =
      Server.call_transition(game.id, :rematch_send_offer, %{player_id: user.id})

    case Helpers.get_rematch_state(game) do
      :accepted ->
        {:ok, new_game} = create_rematch_game(game)
        GlobalSupervisor.terminate_game(game.id)

        {:rematch_, %{game_id: new_game.id}}

      _ ->
        {:rematch_update_status, Game}
    end
  end

  def update_editor_data(game, params) do
    case Server.call_transition(game.id, :update_editor_data, params) do
      {:ok, {_old_game, game}} -> {:ok, game}
      {:error, reason} -> {:error, reason}
    end
  end

  def store_playbook(game) do
    {:ok, playbook} = Server.get_playbook(game.id)
    Task.start(fn -> Playbook.store_playbook(playbook, game.id, game.task.id) end)
  end

  def handle_won_game(game, winner) do
    loser = Helpers.get_opponent(game, winner.id)
    store_game_result!(game, {winner, "won"}, {loser, "lost"})
    store_playbook(game)
    LiveGames.delete_game(game.id)
    Codebattle.PubSub.broadcast("game:finished", %{game: game})
    :ok
  end

  def handle_give_up(game, loser_id) do
    loser = Helpers.get_player(game, loser_id)
    winner = Helpers.get_opponent(game, loser.id)
    store_game_result!(game, {winner, "won"}, {loser, "gave_up"})
    store_playbook(game)
    LiveGames.delete_game(game.id)
    Codebattle.PubSub.broadcast("game:finished", %{game: game})
    :ok
  end

  def get_task(level), do: tasks_provider().get_task(level)

  def store_game_result!(game, {winner, winner_result}, {loser, loser_result}) do
    level = Helpers.get_level(game)
    type = Helpers.get_type(game)
    {new_winner_rating, new_loser_rating} = Elo.calc_elo(winner.rating, loser.rating, level)

    winner_rating_diff = new_winner_rating - winner.rating
    loser_rating_diff = new_loser_rating - loser.rating

    Repo.transaction(fn ->
      create_user_game!(%{
        game_id: game.id,
        user_id: winner.id,
        result: winner_result,
        creator: winner.creator,
        rating: new_winner_rating,
        rating_diff: winner_rating_diff,
        lang: winner.editor_lang
      })

      create_user_game!(%{
        game_id: game.id,
        user_id: loser.id,
        result: loser_result,
        creator: loser.creator,
        rating: new_loser_rating,
        rating_diff: loser_rating_diff,
        lang: loser.editor_lang
      })

      db_game = Repo.get!(Game, game.id)

      update_game!(db_game, %{
        state: game.state,
        starts_at: Helpers.get_starts_at(game),
        finishes_at: TimeHelper.utc_now()
      })

      winner_achievements = Achievements.recalculate_achievements(winner)
      loser_achievements = Achievements.recalculate_achievements(loser)

      # TODO: FIXME
      unless type == "training" do
        update_user!(winner.id, %{
          rating: new_winner_rating,
          achievements: winner_achievements,
          lang: winner.editor_lang
        })

        update_user!(loser.id, %{
          rating: new_loser_rating,
          achievements: loser_achievements,
          lang: loser.editor_lang
        })
      end
    end)
  end

  def update_user!(user_id, params) do
    Repo.get!(User, user_id)
    |> User.changeset(params)
    |> Repo.update!()
  end

  def update_game!(%Game{} = game, params) do
    Game
    |> Repo.get!(game.id)
    |> Game.changeset(params)
    |> Repo.update!()
  end

  def create_user_game!(params) do
    Repo.insert!(UserGame.changeset(%UserGame{}, params))
  end

  def trigger_timeout(%Game{} = game) do
    Logger.debug("Trigger timeout for game: #{game.id}")
    {:ok, {old_game, new_game}} = Server.call_transition(game.id, :timeout, %{})

    case {old_game.state, new_game.state} do
      {s, "timeout"} when s in ["waiting_opponent", "playing"] ->
        Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
        LiveGames.delete_game(game.id)
        update_game!(new_game, %{state: "timeout"})
        terminate_game_after(game, 15)
        :ok

      _ ->
        :ok
    end
  end

  defp terminate_game_after(game, minutes) do
    Game.TimeoutServer.terminate_after(game.id, minutes)
  end

  defp start_timeout_timer(game) do
    Game.TimeoutServer.start_timer(game.id, game.timeout_seconds)
  end

  def broadcast_live_game(game) do
    CodebattleWeb.Endpoint.broadcast!("lobby", "game:upsert", %{
      game: GameView.render_active_game(game)
    })

    :ok
  end

  def insert_game(params) do
    %Game{}
    |> Game.changeset(params)
    |> Repo.insert()
  end

  defp insert_live_game(%{tournament_id: nil} = game), do: LiveGames.insert_new(game)
  defp insert_live_game(_game), do: :ok

  # deprecated
  defp create_rematch_game(game) do
    create_game(game)
  end

  def get_state_from_params(%{type: "solo", users: [_user]}), do: "playing"
  def get_state_from_params(%{users: [_user1, _user2]}), do: "playing"
  def get_state_from_params(%{users: [_user]}), do: "waiting_opponent"

  defp tasks_provider do
    Application.get_env(:codebattle, :tasks_provider)
  end

  defp checker_adapter, do: Application.get_env(:codebattle, :checker_adapter)

  defp get_random_level, do: Enum.random(Codebattle.Task.levels())
end
