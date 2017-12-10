defmodule Codebattle.GameProcess.Play do
  @moduledoc """
  The GameProcess context.
  """

  import Ecto.Query, warn: false

  alias Codebattle.{Repo, Game, User, UserGame}
  alias Codebattle.GameProcess.{Server, Supervisor, Fsm}
  alias Codebattle.CodeCheck.Checker

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

  def create_game(user, level) do
    game = Repo.insert!(%Game{state: "waiting_opponent"})

    task = get_random_task(level)

    fsm = Fsm.new |> Fsm.create(%{user: user, game_id: game.id, task: task})

    Supervisor.start_game(game.id, fsm)
    Codebattle.Chat.Supervisor.start_chat(game.id)

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

  def game_info(id) do
    fsm = get_fsm(id)
    %{
      status: fsm.state, # :playing
      winner: fsm.data.winner,
      first_player: fsm.data.first_player,
      second_player: fsm.data.second_player,
      first_player_editor_text: fsm.data.first_player_editor_text,
      second_player_editor_text: fsm.data.second_player_editor_text,
      task: fsm.data.task,
    }
  end

  def update_editor_text(id, user_id, editor_text) do
    Server.call_transition(id, :update_editor_text, %{user_id: user_id, editor_text: editor_text})
  end

  def check_game(id, user, editor_text, language) do
    fsm = get_fsm(id)
    case check_code(fsm.data.task, editor_text, language) do
      {:ok, true} ->
        {_response, fsm} = Server.call_transition(id, :complete, %{user: user})
        if fsm.state == :game_over do
          terminate_game(id, fsm)
        end
        {:ok, fsm}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp check_code(task, editor_text, language) do
    Checker.check(task, editor_text, language)
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

  defp get_random_task(level) do
    new_level = if Enum.member?(Game.level_difficulties |> Map.keys, level) do
                  level
                else
                  "easy"
                end

    query = from t in Codebattle.Task, order_by: fragment("RANDOM()"), limit: 1, where: ^[level: new_level]
    query |> Repo.all |> Enum.at(0)
  end
end
