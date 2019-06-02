defmodule Codebattle.GameProcess.Engine.Base do
  alias Codebattle.GameProcess.{
    Play,
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    Elo,
    ActiveGames,
    Notifier
  }

  alias Codebattle.{Repo, User, Game, UserGame}
  alias Codebattle.Bot.RecorderServer
  alias Codebattle.User.Achievements

  def update_fsm_text(game_id, player, editor_text) do
    unless player.is_bot do
      RecorderServer.update_text(game_id, player.id, editor_text)
    end

    Server.call_transition(game_id, :update_editor_params, %{
      id: player.id,
      editor_text: editor_text
    })
  end

  def update_fsm_lang(game_id, player, editor_lang) do
    unless player.is_bot do
      RecorderServer.update_lang(game_id, player.id, editor_lang)
    end

    Server.call_transition(game_id, :update_editor_params, %{
      id: player.id,
      editor_lang: editor_lang
    })

    update_user!(player.id, %{lang: editor_lang})
  end

  def store_game_result_async!(fsm, {winner, winner_status}, {loser, loser_status}) do
    level = FsmHelpers.get_level(fsm)
    game_id = FsmHelpers.get_game_id(fsm)
    {new_winner_rating, new_loser_rating} = Elo.calc_elo(winner.rating, loser.rating, level)

    winner_rating_diff = new_winner_rating - winner.rating
    loser_rating_diff = new_loser_rating - loser.rating

    create_user_game!(%{
      game_id: game_id,
      user_id: winner.id,
      result: winner_status,
      creator: winner.creator,
      rating: new_winner_rating,
      rating_diff: winner_rating_diff,
      lang: Map.get(winner, :editor_lang)
    })

    create_user_game!(%{
      game_id: game_id,
      user_id: loser.id,
      result: loser_status,
      creator: loser.creator,
      rating: new_loser_rating,
      rating_diff: loser_rating_diff,
      lang: Map.get(loser, :editor_lang)
    })

    winner_achievements = Achievements.recalculate_achievements(winner)
    loser_achievements = Achievements.recalculate_achievements(loser)

    duration = NaiveDateTime.diff(TimeHelper.utc_now(), FsmHelpers.get_starts_at(fsm))

    update_game!(game_id, %{state: to_string(fsm.state), duration_in_seconds: duration})

    update_user!(winner.id, %{rating: new_winner_rating, achievements: winner_achievements})
    update_user!(loser.id, %{rating: new_loser_rating, achievements: loser_achievements})
  end

  def update_game!(game_id, params) do
    Play.get_game(game_id)
    |> Game.changeset(params)
    |> Repo.update!()
  end

  def update_user!(user_id, params) do
    Repo.get!(User, user_id)
    |> User.changeset(params)
    |> Repo.update!()
  end

  def create_user_game!(params) do
    Repo.insert!(UserGame.changeset(%UserGame{}, params))
  end
end
