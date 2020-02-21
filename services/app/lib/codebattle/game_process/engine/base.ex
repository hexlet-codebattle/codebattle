defmodule Codebattle.GameProcess.Engine.Base do
  alias Codebattle.GameProcess.{
    Play,
    Player,
    Server,
    FsmHelpers,
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
  import Codebattle.GameProcess.Auth

  defmacro __using__(_opts) do
    quote do
      def cancel_game(fsm, user) do
        with %Player{} = player <- FsmHelpers.get_player(fsm, user.id),
             id <- FsmHelpers.get_game_id(fsm),
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

      def update_editor_data(fsm, params) do
        Server.call_transition(FsmHelpers.get_game_id(fsm), :update_editor_data, params)
      end

      def store_playbook(playbook, game_id, task_id) do
        Task.start(fn -> Playbook.store_playbook(playbook, game_id, task_id) end)
      end

      import Codebattle.GameProcess.Engine.Base

      def handle_give_up(game_id, loser_id, fsm) do
        loser = FsmHelpers.get_player(fsm, loser_id)
        winner = FsmHelpers.get_opponent(fsm, loser.id)

        store_game_result!(fsm, {winner, "won"}, {loser, "gave_up"})
        ActiveGames.terminate_game(game_id)

        Notifications.notify_tournament(:game_over, fsm, %{
          state: "finished",
          game_id: game_id,
          winner: {winner.id, "won"},
          loser: {loser.id, "gave_up"}
        })
      end
    end
  end

  def store_game_result!(fsm, {winner, winner_result}, {loser, loser_result}) do
    level = FsmHelpers.get_level(fsm)
    game_id = FsmHelpers.get_game_id(fsm)
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
        lang: Map.get(winner, :editor_lang)
      })

      create_user_game!(%{
        game_id: game_id,
        user_id: loser.id,
        result: loser_result,
        creator: loser.creator,
        rating: new_loser_rating,
        rating_diff: loser_rating_diff,
        lang: Map.get(loser, :editor_lang)
      })

      update_game!(game_id, %{
        state: to_string(fsm.state),
        starts_at: FsmHelpers.get_starts_at(fsm),
        finishs_at: TimeHelper.utc_now()
      })

      winner_achievements = Achievements.recalculate_achievements(winner)
      loser_achievements = Achievements.recalculate_achievements(loser)
      update_user!(winner.id, %{rating: new_winner_rating, achievements: winner_achievements})
      update_user!(loser.id, %{rating: new_loser_rating, achievements: loser_achievements})
    end)

    # Task.start(fn ->
    #   Repo.get!(User, player.id)
    #   |> User.changeset(%{lang: editor_lang})
    #   |> Repo.update!()
    # end)
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

  def start_timeout_timer(id, fsm) do
    if fsm.data.timeout_seconds > 0 do
      Codebattle.GameProcess.TimeoutServer.restart(id, fsm.data.timeout_seconds)
    end
  end

  def broadcast_active_game(fsm) do
    CodebattleWeb.Endpoint.broadcast!("lobby", "game:upsert", %{
      game: GameView.render_active_game(fsm)
    })
  end

  def build_fsm(params), do: Fsm.new() |> Fsm.create(params)
end
