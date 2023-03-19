defmodule Codebattle.InvitesKillerServer do
  @moduledoc "Invites killer server"

  use GenServer
  alias Codebattle.Invite

  @timeout Application.compile_env(:codebattle, Invite)[:timeout]

  @lifetime Application.compile_env(:codebattle, Invite)[:lifetime]

  ## Client API

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  ## Server callbacks

  def init(_) do
    Process.send_after(self(), :check_invites, @timeout)
    {:ok, %{}}
  end

  def call() do
    GenServer.cast(__MODULE__, :check_invites)
  end

  def handle_cast(:check_invites, _) do
    expire_outdated_invites()
    {:noreply, %{}}
  end

  def handle_info(:check_invites, _) do
    expire_outdated_invites()
    Process.send_after(self(), :check_invites, @timeout)
    {:noreply, %{}}
  end

  defp expire_outdated_invites() do
    invites = Invite.list_all_active_invites()
    current_time = NaiveDateTime.utc_now()

    Enum.each(invites, fn invite ->
      diff = Time.diff(current_time, invite.inserted_at, :millisecond)

      if diff > @lifetime do
        Invite.expire_invite(invite)

        data = %{
          state: invite.state,
          id: invite.id
        }

        CodebattleWeb.Endpoint.broadcast!(
          "invites",
          "invites:expired",
          %{invite: data}
        )
      end
    end)
  end
end
