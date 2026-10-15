defmodule Codebattle.ExternalPlatformInvite.Advancer do
  @moduledoc """
  Advances the invite state machine based on current state.

  State transitions:
    pending  -> send_invite  -> creating
    creating -> poll_status  -> invited | failed
    invited  -> check_accepted -> accepted | stay invited
  """

  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext

  @spec advance(map(), map()) :: map()
  def advance(invite, user) do
    advance(invite, user, 3)
  end

  defp advance(invite, _user, 0), do: invite

  defp advance(invite, user, attempts_left) do
    alias_name = invite_alias(user)

    case invite.state do
      "pending" -> try_advance(InviteContext.send_invite(invite, alias_name), invite, user, attempts_left)
      "creating" -> try_advance(InviteContext.poll_status(invite), invite, user, attempts_left)
      "invited" -> try_advance(InviteContext.check_accepted(invite), invite, user, attempts_left)
      _ -> invite
    end
  end

  defp try_advance({:ok, updated}, invite, user, attempts_left) do
    if updated.state == invite.state do
      updated
    else
      advance(updated, user, attempts_left - 1)
    end
  end

  defp try_advance({:error, _}, invite, _user, _attempts_left), do: invite

  defp invite_alias(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp invite_alias(%{name: name}) when is_binary(name) and name != "", do: name
  defp invite_alias(_), do: ""
end
