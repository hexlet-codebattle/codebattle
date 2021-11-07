defmodule Codebattle.Game.Engine.Base do
  alias Codebattle.Game.{
    Play,
    Player,
    Engine,
    Server,
    GameHelpers,
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

  @callback create_game(map()) ::
              {:ok, %Fsm{}}
              | {:error, any()}
  @callback rematch_send_offer(any(), any()) ::
              {:rematch_new_game, map()}
              | {:rematch_update_status, map()}
              | {:error, any()}

  defmacro __using__(_opts) do
    quote do
      @behaviour Engine.Base
      import Codebattle.Game.Auth

      def cancel_game(fsm, user) do
        with %Player{} = player <- GameHelpers.get_player(fsm, user.id),
             id <- GameHelpers.get_game_id(fsm),
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
        Server.call_transition(GameHelpers.get_game_id(fsm), :update_editor_data, params)
      end

      def store_playbook(fsm) do
        game_id = GameHelpers.get_game_id(fsm)
        task_id = GameHelpers.get_task(fsm).id
        {:ok, playbook} = Server.get_playbook(game_id)

        Task.start(fn -> Playbook.store_playbook(playbook, game_id, task_id) end)
      end

      def handle_won_game(game_id, winner, fsm) do
        loser = GameHelpers.get_opponent(fsm, winner.id)
        store_game_result!(fsm, {winner, "won"}, {loser, "lost"})
        store_playbook(fsm)
        ActiveGames.terminate_game(game_id)
        Codebattle.PubSub.broadcast("game:finished", %{game: game, winner: winner, loser: loser})
        :ok
      end

      def handle_give_up(game_id, loser_id, fsm) do
        loser = GameHelpers.get_player(fsm, loser_id)
        winner = GameHelpers.get_opponent(fsm, loser.id)
        store_game_result!(fsm, {winner, "won"}, {loser, "gave_up"})
        store_playbook(fsm)
        ActiveGames.terminate_game(game_id)
        Codebattle.PubSub.broadcast("game:finished", %{game: game, winner: winner, loser: loser})
      end

      def get_task(level), do: tasks_provider().get_task(level)

      def store_game_result!(fsm, {winner, winner_result}, {loser, loser_result}) do
        level = GameHelpers.get_level(fsm)
        game_id = GameHelpers.get_game_id(fsm)
        type = GameHelpers.get_type(fsm)
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
            state: to_string(fsm.state),
            starts_at: GameHelpers.get_starts_at(fsm),
            finishs_at: TimeHelper.utc_now()
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

      def start_timeout_timer(id, fsm) do
        Codebattle.Game.TimeoutServer.start_timer(id, fsm.data.timeout_seconds)
        :ok
      end

      def broadcast_active_game(fsm) do
        CodebattleWeb.Endpoint.broadcast!("lobby", "game:upsert", %{
          game: GameView.render_active_game(fsm)
        })
      end

      def build_fsm(params), do: Fsm.new() |> Fsm.create(params)

      def insert_game(params) do
        %Game{}
        |> Game.changeset(params)
        |> Repo.insert()
      end

      defp tasks_provider do
        Application.get_env(:codebattle, :tasks_provider)
      end
    end
  end
end
