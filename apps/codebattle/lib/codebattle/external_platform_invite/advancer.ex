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
    alias_name = invite_alias(user)

    case invite.state do
      "pending" -> try_advance(InviteContext.send_invite(invite, alias_name), invite)
      "creating" -> try_advance(InviteContext.poll_status(invite), invite)
      "invited" -> try_advance(InviteContext.check_accepted(invite, invite_login(user)), invite)
      _ -> invite
    end
  end

  defp try_advance({:ok, updated}, _invite), do: updated
  defp try_advance({:error, _}, invite), do: invite

  defp invite_alias(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp invite_alias(%{name: name}) when is_binary(name) and name != "", do: name
  defp invite_alias(_), do: ""

  defp invite_login(%{external_platform_login: login}) when is_binary(login) and login != "", do: login
  defp invite_login(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp invite_login(%{name: name}) when is_binary(name) and name != "", do: name
  defp invite_login(_), do: ""
end
