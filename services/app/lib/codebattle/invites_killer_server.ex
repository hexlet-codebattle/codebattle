defmodule Codebattle.InvitesKillerServer do
  @moduledoc "Invites killer server"

  use GenServer
  alias Codebattle.Invite

  @timeout Application.compile_env(:codebattle, Invite)[:timeout]

  @lifetime Application.compile_env(:codebattle, Invite)[:lifetime]

  ## Client API

  def start_link do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  ## Server callbacks

  def init(_) do
    Process.send_after(self(), :work, @timeout)
    {:ok, %{}}
  end

  def work do
    GenServer.cast(__MODULE__, :work)
  end

  def handle_cast(:work, _) do
    do_work()
    {:noreply, %{}}
  end

  def handle_info(:work, _) do
    do_work()
    Process.send_after(self(), :work, @timeout)
    {:noreply, %{}}
  end

  def do_work do
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
          "main:#{invite.recepient_id}",
          "invites:expired",
          %{invite: data}
        )

        CodebattleWeb.Endpoint.broadcast!(
          "main:#{invite.creator_id}",
          "invites:expired",
          %{invite: data}
        )
      end
    end)
  end
end
