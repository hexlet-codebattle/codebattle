defmodule Codebattle.Game.Engine do
  alias Codebattle.Game.{
    Play,
    Player,
    Engine,
    Server,
    Helpers,
    ActiveGames,
    Fsm,
    Elo,
    GlobalSupervisor
  }

  alias Codebattle.{Repo, User, Game, UserGame}
  alias Codebattle.User.Achievements
  alias CodebattleWeb.Api.GameView
  alias Codebattle.Bot.Playbook

  alias CodebattleWeb.Notifications

  import Codebattle.Game.Auth

  @default_timeout 3600
  @max_timeout 7200

  def create_game(params) do
    %{users: [creator, recipient], level: level, type: type} = params
    task = get_task(level)
    creator_player = Player.build(creator, %{creator: true, task: task})
    recipient_player = Player.build(recipient, %{task: task})

    timeout_seconds = params.timeout_seconds

    with :ok <- player_can_create_game?(recipient_player),
         langs <- Languages.get_langs_with_solutions(task),
         {:ok, game} <-
           insert_game(%{
             state: "playing",
             level: level,
             type: type,
             task_id: task.id
           }),
         fsm <-
           build_fsm(%{
             module: __MODULE__,
             players: [creator_player, recipient_player],
             game_id: game.id,
             level: level,
             type: type,
             state: :playing,
             langs: langs,
             starts_at: TimeHelper.utc_now(),
             inserted_at: game.inserted_at,
             timeout_seconds: timeout_seconds,
             task: task
           }),
         :ok <- ActiveGames.create_game(fsm),
         {:ok, _} <- GlobalSupervisor.start_game(fsm),
         :ok <- start_timeout_timer(game.id, fsm) do
      broadcast_active_game(fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(game, user) do
    with %Player{} = player <- Helpers.get_player(game, user.id),
         id <- Helpers.get_game_id(game),
         :ok <- player_can_cancel_game?(id, player) do
      ActiveGames.terminate_game(id)
      GlobalSupervisor.terminate_game(id)
      Notifications.remove_active_game(id)

      id
      |> Play.get_game()
      |> Game.changeset(%{state: "canceled"})
      |> Repo.update!()

      :ok
    else
      {:error, reason} -> {:error, reason}
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
    ActiveGames.terminate_game(game_id)
    # Codebattle.PubSub.broadcast("game:finished", %{game: game, winner: winner, loser: loser})
    :ok
  end

  def handle_give_up(game_id, loser_id, game) do
    loser = Helpers.get_player(game, loser_id)
    winner = Helpers.get_opponent(game, loser.id)
    store_game_result!(game, {winner, "won"}, {loser, "gave_up"})
    store_playbook(game)
    ActiveGames.terminate_game(game_id)
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

      update_game!(game_id, %{
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

  def update_game!(game_id, params) do
    Play.get_game(game_id)
    |> Game.changeset(params)
    |> Repo.update!()
  end

  def create_user_game!(params) do
    Repo.insert!(UserGame.changeset(%UserGame{}, params))
  end

  def start_timeout_timer(id, game) do
    Codebattle.Game.TimeoutServer.start_timer(id, game.data.timeout_seconds)
    :ok
  end

  def broadcast_active_game(game) do
    CodebattleWeb.Endpoint.broadcast!("lobby", "game:upsert", %{
      game: GameView.render_active_game(game)
    })
  end

  def build_fsm(params), do: Fsm.new() |> Fsm.create(params)

  def insert_game(params) do
    %Game{}
    |> Game.changeset(params)
    |> Repo.insert()
  end

  defp create_rematch_game(game) do
    create_game(game)
  end

  defp tasks_provider do
    Application.get_env(:codebattle, :tasks_provider)
  end
end
