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

    # TOD: implement task choice in Web interface

    task = get_random_task()

    fsm = Fsm.new |> Fsm.create(%{user: user, game_id: game.id, task: task})

    Supervisor.start_game(game.id, fsm)

    # TOD: Run bot if second plyaer not connected after 5 seconds
    params = %{game_id: game.id, task_id: task.id}

    # {:ok, pid} = Task.Supervisor.start_link(restart: :transient, max_restarts: 5)
    # Task.Supervisor.start_child(pid, Codebattle.Bot.PlaybookPlayerTask, :run, [params])
    Task.start(Codebattle.Bot.PlaybookPlayerTask, :run, [params])
    # Codebattle.Bot.PlaybookPlayerTask.run params

    game.id
  end

  def join_game(id, user) do
    Server.call_transition(id, :join, %{user: user})
  end

  def game_info(game_id) do
    fsm = get_fsm(game_id)
    %{
      status: fsm.state, # :playing
      winner: fsm.data.winner,
      first_player: fsm.data.first_player,
      second_player: fsm.data.second_player,
      first_player_editor_text: fsm.data.first_player_editor_text,
      second_player_editor_text: fsm.data.second_player_editor_text,
    }
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

    if fsm.data.winner.id != 0 do
      winner = User.changeset(fsm.data.winner, %{raiting: (fsm.data.winner.raiting + 1)})
      Repo.update! winner
    end

    if fsm.data.loser.id != 0 do
      loser = User.changeset(fsm.data.loser, %{raiting: (fsm.data.loser.raiting - 1)})
      Repo.update! loser
    end

    Supervisor.stop_game(id)
  end

  defp get_random_task do
    query = from t in Codebattle.Task, order_by: fragment("RANDOM()"), limit: 1
    query |> Repo.all |> Enum.at 0
  end
end
