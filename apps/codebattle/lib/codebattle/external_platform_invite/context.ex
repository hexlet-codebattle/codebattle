defmodule Codebattle.ExternalPlatformInvite.Context do
  @moduledoc """
  Manages the invite state machine for external platform invitations.

  States: pending → creating → invited → accepted
                       ↓
                     failed
                       ↓
                    expired

  Transitions:
    pending  → creating  (send_invite succeeds, got operation_id + status_url)
    pending  → failed    (send_invite HTTP error)
    creating → invited   (poll_status: operation completed with invite_link)
    creating → failed    (poll_status: operation completed with errors)
    invited  → accepted  (check_accepted: user found on platform)
    invited  → expired   (check_accepted: expires_at has passed)
    failed   → creating  (retry via send_invite)
  """

  import Ecto.Query

  alias Codebattle.ExternalPlatform
  alias Codebattle.ExternalPlatformInvite
  alias Codebattle.Repo

  require Logger

  @spec get_invite(pos_integer(), pos_integer() | nil) :: ExternalPlatformInvite.t() | nil
  def get_invite(user_id, group_tournament_id \\ nil) do
    ExternalPlatformInvite
    |> where([i], i.user_id == ^user_id)
    |> filter_by_tournament(group_tournament_id)
    |> Repo.one()
  end

  @spec get_or_create_invite(pos_integer(), pos_integer() | nil) :: ExternalPlatformInvite.t()
  def get_or_create_invite(user_id, group_tournament_id \\ nil) do
    case get_invite(user_id, group_tournament_id) do
      nil ->
        {:ok, invite} =
          %ExternalPlatformInvite{}
          |> ExternalPlatformInvite.changeset(%{
            user_id: user_id,
            group_tournament_id: group_tournament_id,
            state: "pending"
          })
          |> Repo.insert()

        invite

      invite ->
        invite
    end
  end

  @doc """
  Sends an invite to the external platform.
  Transitions: pending → creating, failed → creating, or pending → failed.
  """
  @spec send_invite(ExternalPlatformInvite.t(), String.t(), keyword()) ::
          {:ok, ExternalPlatformInvite.t()} | {:error, term()}
  def send_invite(invite, alias_name, opts \\ [])

  def send_invite(%ExternalPlatformInvite{state: state} = invite, alias_name, opts) when state in ["pending", "failed"] do
    case ExternalPlatform.create_invite(alias_name, opts) do
      {:ok, body} ->
        transition_to_creating(invite, body)

      {:error, reason} ->
        transition_to_failed(invite, reason)
    end
  end

  def send_invite(%ExternalPlatformInvite{state: state}, _alias_name, _opts) do
    {:error, {:invalid_transition, state, "creating"}}
  end

  @doc """
  Polls the status_url to check if the async invite operation has completed.
  Transitions: creating → invited, or creating → failed.
  """
  @spec poll_status(ExternalPlatformInvite.t()) ::
          {:ok, ExternalPlatformInvite.t()} | {:error, term()}
  def poll_status(%ExternalPlatformInvite{state: "creating", operation_id: operation_id} = invite)
      when is_binary(operation_id) do
    case ExternalPlatform.poll_invite_status(operation_id) do
      {:ok, %{"status" => "completed"} = body} ->
        transition_from_creating(invite, body)

      {:ok, %{"status" => status} = body} when status in ["scheduled", "running"] ->
        update_invite(invite, %{response: body})

      {:ok, %{"error" => _} = body} ->
        transition_to_failed(invite, body)

      {:error, reason} ->
        transition_to_failed(invite, reason)
    end
  end

  def poll_status(%ExternalPlatformInvite{state: "creating", operation_id: nil}) do
    {:error, :no_operation_id}
  end

  def poll_status(%ExternalPlatformInvite{state: state}) do
    {:error, {:invalid_transition, state, "poll_status"}}
  end

  @doc """
  Checks if the user has accepted the invite on the external platform.
  Transitions: invited → accepted, or invited → expired.
  """
  @spec check_accepted(ExternalPlatformInvite.t(), String.t()) ::
          {:ok, ExternalPlatformInvite.t()} | {:error, term()}
  def check_accepted(%ExternalPlatformInvite{state: "invited"} = invite, login) do
    if expired?(invite) do
      update_invite(invite, %{state: "expired"})
    else
      case ExternalPlatform.check_invite(login) do
        {:ok, _user_data} ->
          update_invite(invite, %{state: "accepted"})

        {:error, :not_accepted} ->
          {:error, :not_accepted}
      end
    end
  end

  def check_accepted(%ExternalPlatformInvite{state: state}, _login) do
    {:error, {:invalid_transition, state, "accepted"}}
  end

  # -- Private --

  defp transition_to_creating(invite, body) do
    attrs = %{
      state: "creating",
      operation_id: Map.get(body, "operation_id"),
      status_url: Map.get(body, "status_url"),
      response: body
    }

    update_invite(invite, attrs)
  end

  defp transition_from_creating(invite, body) do
    invites = get_in(body, ["response", "invites"]) || []
    errors = get_in(body, ["response", "errors"]) || []

    case {invites, errors} do
      {[first_invite | _], _} ->
        attrs = %{
          state: "invited",
          invite_link: Map.get(first_invite, "invite_link"),
          expires_at: parse_datetime(Map.get(first_invite, "expires_at")),
          response: body
        }

        update_invite(invite, attrs)

      {[], [_ | _]} ->
        transition_to_failed(invite, body)

      _ ->
        transition_to_failed(invite, body)
    end
  end

  defp transition_to_failed(invite, reason) when is_map(reason) do
    update_invite(invite, %{state: "failed", response: reason})
  end

  defp transition_to_failed(invite, reason) do
    update_invite(invite, %{state: "failed", response: %{"error" => inspect(reason)}})
  end

  defp update_invite(invite, attrs) do
    invite
    |> ExternalPlatformInvite.changeset(attrs)
    |> Repo.update()
  end

  defp expired?(%ExternalPlatformInvite{expires_at: nil}), do: false

  defp expired?(%ExternalPlatformInvite{expires_at: expires_at}) do
    DateTime.after?(DateTime.utc_now(), expires_at)
  end

  defp parse_datetime(nil), do: nil

  defp parse_datetime(str) when is_binary(str) do
    case DateTime.from_iso8601(str) do
      {:ok, dt, _offset} -> DateTime.truncate(dt, :second)
      _ -> nil
    end
  end

  defp parse_datetime(_), do: nil

  defp filter_by_tournament(query, nil) do
    where(query, [i], is_nil(i.group_tournament_id))
  end

  defp filter_by_tournament(query, group_tournament_id) do
    where(query, [i], i.group_tournament_id == ^group_tournament_id)
  end
end
