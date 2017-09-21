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
    id = String.to_integer(id)
    Server.fsm(id)
  end

  def create_game(user) do
    game = Repo.insert!(%Game{state: "waiting_opponent"})

    fsm = Fsm.new |> Fsm.create(%{game_id: game.id, user: user})

    Supervisor.start_game(game.id, fsm)
    game.id
  end

  def join_game(id, user) do
    id = String.to_integer(id)
    Server.call_transition(id, :join, %{user: user})
  end

  def update_data(id, user_id, data) do
    id = String.to_integer(id)
    Server.call_transition(id, :update_editor_data, %{user_id: user_id, data: data})
  end

  def check_game(id, user) do
    id = String.to_integer(id)
    case check_asserts() do
      {:ok, true} ->
        {_response, fsm} = Server.call_transition(id, :complete, %{user: user})
        if fsm.state == :game_over do
          terminate_game(fsm)
        end
        {:ok, fsm}
    end
  end

  defp check_asserts do
    # Сюда впилим проверку clojure
    {:ok, true}
  end

  defp terminate_game(fsm) do
    game = get_game(fsm.data.game_id)
    new_game = Game.changeset(game, %{state: to_string(fsm.state)})
    Repo.update! new_game
    Repo.insert!(%UserGame{game_id: game.id, user_id: fsm.data.winner.id, result: "win"})
    Repo.insert!(%UserGame{game_id: game.id, user_id: fsm.data.loser.id, result: "lose"})

    winner = User.changeset(fsm.data.winner, %{raiting: (fsm.data.winner.raiting + 1)})
    loser = User.changeset(fsm.data.loser, %{raiting: (fsm.data.loser.raiting - 1)})
    Repo.update! winner
    Repo.update! loser
    Supervisor.stop_game(game.id)
  end
end
