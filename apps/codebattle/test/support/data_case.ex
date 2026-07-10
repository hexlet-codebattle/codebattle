defmodule Codebattle.DataCase do
  @moduledoc false
  use ExUnit.CaseTemplate

  alias Codebattle.Repo
  alias Ecto.Adapters.SQL.Sandbox

  using do
    quote do
      import Codebattle.DataCase
      import CodebattleWeb.Factory
      import Ecto
      import Ecto.Changeset
      import Ecto.Query

      alias Codebattle.Game
      alias Codebattle.Repo
      alias Codebattle.User
      alias Codebattle.UserGame
    end
  end

  setup tags do
    setup_sandbox(tags)
    :ok
  end

  @doc """
  Sets up the sandbox based on the test tags.
  """
  def setup_sandbox(tags) do
    pid = Sandbox.start_owner!(Repo, shared: not tags[:async])
    FunWithFlags.enable(:async_game_score_on_join)

    on_exit(fn ->
      terminate_supervisor_children(Codebattle.GroupTournament.GlobalSupervisor)
      terminate_supervisor_children(Codebattle.Tournament.GlobalSupervisor)
      terminate_supervisor_children(Codebattle.Game.GlobalSupervisor)
      Sandbox.stop_owner(pid)
    end)
  end

  defp terminate_supervisor_children(supervisor) do
    if Process.whereis(supervisor) do
      supervisor
      |> Supervisor.which_children()
      |> Enum.each(fn {id, _pid, _type, _modules} ->
        Supervisor.terminate_child(supervisor, id)
        Supervisor.delete_child(supervisor, id)
      end)
    end
  end
end
