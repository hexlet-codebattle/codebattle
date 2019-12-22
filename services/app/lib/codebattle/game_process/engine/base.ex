defmodule Codebattle.GameProcess.Engine.Base do
  alias Codebattle.GameProcess.{
    Play,
    Server,
    FsmHelpers,
    Elo
  }

  alias Codebattle.{Repo, User, Game, UserGame}
  alias Codebattle.Bot.RecorderServer
  alias Codebattle.User.Achievements

  defmacro __using__(_opts) do
    quote do
      def update_text(game_id, player, editor_text) do
        unless player.is_bot do
          RecorderServer.update_text(game_id, player.id, editor_text)
        end

        Server.call_transition(game_id, :update_editor_params, %{
          id: player.id,
          editor_text: editor_text
        })
      end

      def update_lang(game_id, player, editor_lang) do
        unless player.is_bot do
          RecorderServer.update_lang(game_id, player.id, editor_lang)
        end

        Server.call_transition(game_id, :update_editor_params, %{
          id: player.id,
          editor_lang: editor_lang
        })

        Task.start(fn ->
          Repo.get!(User, player.id)
          |> User.changeset(%{lang: editor_lang})
          |> Repo.update!()
        end)
      end

      import Codebattle.GameProcess.Engine.Base
    end
  end

  def start_record_fsm(game_id, [first_player, second_player], fsm) do
    unless first_player.is_bot do
      {:ok, _} = Codebattle.Bot.Supervisor.start_record_server(game_id, first_player, fsm)
    end

    unless second_player.is_bot do
      {:ok, _} = Codebattle.Bot.Supervisor.start_record_server(game_id, second_player, fsm)
    end

    {:ok, fsm}
  end

  def store_game_result!(fsm, {winner, winner_result}, {loser, loser_result}) do
    level = FsmHelpers.get_level(fsm)
    game_id = FsmHelpers.get_game_id(fsm)
    {new_winner_rating, new_loser_rating} = Elo.calc_elo(winner.rating, loser.rating, level)

    winner_rating_diff = new_winner_rating - winner.rating
    loser_rating_diff = new_loser_rating - loser.rating

    duration = NaiveDateTime.diff(TimeHelper.utc_now(), FsmHelpers.get_starts_at(fsm))

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

      update_game!(game_id, %{state: to_string(fsm.state), duration_in_seconds: duration})

      winner_achievements = Achievements.recalculate_achievements(winner)
      loser_achievements = Achievements.recalculate_achievements(loser)
      update_user!(winner.id, %{rating: new_winner_rating, achievements: winner_achievements})
      update_user!(loser.id, %{rating: new_loser_rating, achievements: loser_achievements})
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
    if fsm.data.timeout_seconds > 0 do
      Codebattle.GameProcess.TimeoutServer.restart(id, fsm.data.timeout_seconds)
    end
  end
end
