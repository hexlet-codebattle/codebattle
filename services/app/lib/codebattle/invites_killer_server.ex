defmodule Codebattle.InvitesKillerServer do
  @moduledoc "Invites killer server"

  use GenServer
  alias Codebattle.Invite

  @timeout Application.compile_env(:codebattle, Invite)[
    :timeout
  ]

  ## Client API

  def start_link do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  ## Server callbacks

  def init(_) do
        Process.send_after(self(), :trigger_timeout, :timer.seconds(@timeout))
    {:ok, %{}}
  end

  def handle_info(:trigger_timeout, _) do
    invites = Invite.list_all_active_invites
    current_time = NaiveDateTime.utc_now
    Enum.each(invites, fn invite ->
      diff = Time.diff(invite.inserted_at, current_time, :minute)
      if diff > 15 do
        Invite.expire_invite(invite)
      end
    end)
    Process.send_after(self(), :trigger_timeout, :timer.seconds(@timeout))
    {:noreply, state}
  end

end
