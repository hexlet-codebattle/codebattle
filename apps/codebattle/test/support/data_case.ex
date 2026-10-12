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
        forget_tournament_info(supervisor, id)
      end)
    end
  end

  # A tournament server that starts and finds its id in the info cache assumes it crashed
  # and restores itself in the background. Stopping servers between tests must not leave
  # such entries behind for a later tournament that gets the same id.
  defp forget_tournament_info(Codebattle.Tournament.GlobalSupervisor, id) do
    if :ets.whereis(:tournament_info_cache) != :undefined do
      :ets.delete(:tournament_info_cache, String.to_integer(id))
    end
  end

  defp forget_tournament_info(_supervisor, _id), do: :ok
end
