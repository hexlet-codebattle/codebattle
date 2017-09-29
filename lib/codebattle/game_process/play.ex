defmodule Codebattle.GameProcess.Play do
  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game, User, UserGame}
  alias Codebattle.GameProcess.{Server, Supervisor, Fsm}

  def list_games do
    Repo.all from p in Game,
      preload: [:users]
  end

  def list_fsms do
    Supervisor.current_games
  end

  def get_game(id) do
    Repo.get(Game, id)
  end

  def get_fsm(id) do
    Server.fsm(id)
  end

  def create_game(user) do
    game = Repo.insert!(%Game{state: "waiting_opponent"})

    fsm = Fsm.new |> Fsm.create(%{user: user, game_id: game.id})

    Supervisor.start_game(game.id, fsm)
    game.id
  end

  def join_game(id, user) do
    Server.call_transition(id, :join, %{user: user})
  end

  def game_info(game_id) do
    fsm = get_fsm(game_id)
    %{
      status: fsm.state, # :playing
      winner: fsm.data.winner && fsm.data.winner.name,
      first_player: player_info(fsm.data.first_player),
      second_player: player_info(fsm.data.second_player),
      first_player_editor_text: fsm.data.first_player_editor_text,
      second_player_editor_text: fsm.data.second_player_editor_text,
    }
  end

  def player_info(player) do
    if player do
      %{
        id: player.id,
        name: player.name,
        raiting: player.raiting,
      }
    else
      %{
        id: nil,
        name: nil,
        raiting: nil,
      }
    end
  end

  def update_editor_text(id, user_id, editor_text) do
    Server.call_transition(id, :update_editor_text, %{user_id: user_id, editor_text: editor_text})
  end

  def check_game(id, user) do
    case check_asserts() do
      {:ok, true} ->
        {_response, fsm} = Server.call_transition(id, :complete, %{user: user})
        if fsm.state == :game_over do
          terminate_game(id, fsm)
        end
        {:ok, fsm}
    end
  end

  defp check_asserts do
    # Сюда впилим проверку clojure
    {:ok, true}
  end

  defp terminate_game(id, fsm) do
    game = get_game(id)
    new_game = Game.changeset(game, %{state: to_string(fsm.state)})
    Repo.update! new_game
    Repo.insert!(%UserGame{game_id: game.id, user_id: fsm.data.winner.id, result: "win"})
    Repo.insert!(%UserGame{game_id: game.id, user_id: fsm.data.loser.id, result: "lose"})

    winner = User.changeset(fsm.data.winner, %{raiting: (fsm.data.winner.raiting + 1)})
    loser = User.changeset(fsm.data.loser, %{raiting: (fsm.data.loser.raiting - 1)})
    Repo.update! winner
    Repo.update! loser
    Supervisor.stop_game(id)
  end
end
