defmodule Codebattle.Game.Engine do
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

  @default_timeout 30 * 60
  @max_timeout 2 * 60 * 60

  def create_game(params) do
    level = params[:level] || get_random_level()
    task = params[:task] || get_task(level)
    state = params[:state] || get_state_from_params(params)
    type = params[:type] || "standard"
    visibility_type = params[:visibility_type] || "public"
    timeout_seconds = params[:timeout_seconds] || @default_timeout
    [creator | _] = params.users

    players =
      Enum.map(params.users, fn user ->
        Player.build(user, %{creator: user.id == creator.id, task: task})
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
             task: task,
             players: players
           }),
         game <- Map.merge(game, %{langs: langs}),
         {:ok, _} <- GlobalSupervisor.start_game(game),
         :ok <- LiveGames.create_game(game),
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
         {:ok, game} <-
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
        LiveGames.terminate_game(game.id)
        GlobalSupervisor.terminate_game(game.id)
        :ok

      _ ->
        :ok
    end
  end

  def rematch_send_offer(game, user) do
    {:ok, game} = Server.call_transition(game.id, :rematch_send_offer, %{player_id: user.id})

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
    Server.call_transition(Helpers.get_game_id(game), :update_editor_data, params)
  end

  def store_playbook(game) do
    game_id = Helpers.get_game_id(game)
    task_id = Helpers.get_task(game).id
    {:ok, playbook} = Server.get_playbook(game_id)

    Task.start(fn -> Playbook.store_playbook(playbook, game_id, task_id) end)
  end

  def handle_won_game(game_id, winner, game) do
    loser = Helpers.get_opponent(game, winner.id)
    store_game_result!(game, {winner, "won"}, {loser, "lost"})
    store_playbook(game)
    LiveGames.terminate_game(game_id)
    # Codebattle.PubSub.broadcast("game:finished", %{game: game, winner: winner, loser: loser})
    :ok
  end

  def handle_give_up(game_id, loser_id, game) do
    loser = Helpers.get_player(game, loser_id)
    winner = Helpers.get_opponent(game, loser.id)
    store_game_result!(game, {winner, "won"}, {loser, "gave_up"})
    store_playbook(game)
    LiveGames.terminate_game(game_id)
    # Codebattle.PubSub.broadcast("game:finished", %{game: game, winner: winner, loser: loser})
  end

  def get_task(level), do: tasks_provider().get_task(level)

  def store_game_result!(game, {winner, winner_result}, {loser, loser_result}) do
    level = Helpers.get_level(game)
    game_id = Helpers.get_game_id(game)
    type = Helpers.get_type(game)
    {new_winner_rating, new_loser_rating} = Elo.calc_elo(winner.rating, loser.rating, level)

    winner_rating_diff = new_winner_rating - winner.rating
    loser_rating_diff = new_loser_rating - loser.rating

    Repo.transaction(fn ->
      create_user_game!(%{
        game_id: game_id,
        user_id: winner.id,
        result: winner_result,
        creator: winner.creator,
        rating: new_winner_rating,
        rating_diff: winner_rating_diff,
        lang: winner.editor_lang
      })

      create_user_game!(%{
        game_id: game_id,
        user_id: loser.id,
        result: loser_result,
        creator: loser.creator,
        rating: new_loser_rating,
        rating_diff: loser_rating_diff,
        lang: loser.editor_lang
      })

      update_game!(game, %{
        state: to_string(game.state),
        starts_at: Helpers.get_starts_at(game),
        finishes_at: TimeHelper.utc_now()
      })

      winner_achievements = Achievements.recalculate_achievements(winner)
      loser_achievements = Achievements.recalculate_achievements(loser)

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
    game
    |> Game.changeset(params)
    |> Repo.update!()
  end

  def create_user_game!(params) do
    Repo.insert!(UserGame.changeset(%UserGame{}, params))
  end

  def start_timeout_timer(game) do
    Codebattle.Game.TimeoutServer.start_timer(game.id, game.timeout_seconds)
    :ok
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

  defp get_random_level, do: Enum.random(Codebattle.Task.levels())
end
