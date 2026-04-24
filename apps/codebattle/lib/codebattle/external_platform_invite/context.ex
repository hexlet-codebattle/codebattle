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
  alias Codebattle.User

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
      {:ok, %{"status" => status} = body} when status in ["completed", "success"] ->
        transition_from_creating(invite, body)

      {:ok, %{"status" => status} = body} when status in ["scheduled", "running"] ->
        update_invite(invite, %{response: body})

      {:ok, %{"status" => status} = body} when status in ["failed", "cancel", "canceled"] ->
        transition_to_failed(invite, body)

      {:ok, %{"error" => _} = body} ->
        transition_to_failed(invite, body)

      {:ok, body} ->
        # Unknown status - store body but don't transition, so poll can be retried.
        update_invite(invite, %{response: body})

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
  Checks if the user has accepted the invite on the external platform
  by fetching the invite by its platform ID.
  Transitions: invited → accepted, or invited → expired.
  """
  @spec check_accepted(ExternalPlatformInvite.t()) ::
          {:ok, ExternalPlatformInvite.t()} | {:error, term()}
  def check_accepted(%ExternalPlatformInvite{state: "invited"} = invite) do
    if expired?(invite) do
      update_invite(invite, %{state: "expired"})
    else
      do_check_accepted(invite)
    end
  end

  def check_accepted(%ExternalPlatformInvite{state: state}) do
    {:error, {:invalid_transition, state, "accepted"}}
  end

  defp do_check_accepted(invite) do
    case extract_platform_invite_id(invite) do
      nil ->
        {:error, :no_platform_invite_id}

      platform_invite_id ->
        case ExternalPlatform.check_invite(platform_invite_id) do
          {:ok, body} ->
            invitee = Map.get(body, "invitee") || %{}
            user_data = %{id: Map.get(invitee, "id"), login: Map.get(invitee, "slug")}
            _ = persist_platform_user(invite.user_id, user_data)
            accept_and_enqueue_setup(invite, body)

          {:error, :not_accepted} ->
            {:error, :not_accepted}
        end
    end
  end

  defp accept_and_enqueue_setup(invite, body) do
    changeset =
      ExternalPlatformInvite.changeset(invite, %{
        state: "accepted",
        response: merge_response(invite.response, body)
      })

    Ecto.Multi.new()
    |> Ecto.Multi.update(:invite, changeset)
    |> maybe_insert_setup_job(invite)
    |> Repo.transaction()
    |> case do
      {:ok, %{invite: updated_invite}} -> {:ok, updated_invite}
      {:error, :invite, changeset, _} -> {:error, changeset}
    end
  end

  defp maybe_insert_setup_job(multi, %{group_tournament_id: gt_id, user_id: user_id})
       when not is_nil(gt_id) do
    job =
      Codebattle.Workers.ExternalSetupWorker.new(%{
        user_id: user_id,
        group_tournament_id: gt_id
      })

    Oban.insert(multi, :external_setup, job)
  end

  defp maybe_insert_setup_job(multi, _invite), do: multi

  @doc """
  Re-fetches the invite from SourceCraft (using the new GET /invites/{id} endpoint)
  and updates our state machine based on the platform-reported status.

  Maps the platform's invite status to our state machine:
    "creating" → no change (still being created on the platform)
    "pending"  → "invited"   (link is ready, user hasn't accepted yet)
    "accepted" → "accepted"  (and we mirror invitee.id/slug onto the User record)
    "rejected" → "failed"
  """
  @spec refresh_status_via_api(ExternalPlatformInvite.t()) ::
          {:ok, ExternalPlatformInvite.t()} | {:error, term()}
  def refresh_status_via_api(%ExternalPlatformInvite{} = invite) do
    case extract_platform_invite_id(invite) do
      nil ->
        {:error, :no_platform_invite_id}

      invite_id ->
        case ExternalPlatform.get_invite(invite_id) do
          {:ok, body} ->
            apply_platform_invite_status(invite, body)

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp extract_platform_invite_id(%ExternalPlatformInvite{response: response}) when is_map(response) do
    cond do
      id = get_in(response, ["response", "invites", Access.at(0), "id"]) -> id
      id = Map.get(response, "id") -> id
      true -> nil
    end
  end

  defp extract_platform_invite_id(_), do: nil

  defp apply_platform_invite_status(invite, %{"status" => "accepted"} = body) do
    invitee = Map.get(body, "invitee") || %{}

    user_data = %{
      id: Map.get(invitee, "id"),
      login: Map.get(invitee, "slug")
    }

    _ = persist_platform_user(invite.user_id, user_data)
    accept_and_enqueue_setup(invite, body)
  end

  defp apply_platform_invite_status(invite, %{"status" => "pending"} = body) do
    attrs =
      %{
        state: "invited",
        response: merge_response(invite.response, body)
      }
      |> maybe_put(:invite_link, Map.get(body, "invite_link"))
      |> maybe_put(:expires_at, parse_datetime(Map.get(body, "expires_at")))

    update_invite(invite, attrs)
  end

  defp apply_platform_invite_status(invite, %{"status" => "rejected"} = body) do
    update_invite(invite, %{state: "failed", response: merge_response(invite.response, body)})
  end

  defp apply_platform_invite_status(invite, %{"status" => "creating"} = body) do
    # Platform still creating - just update the response, don't transition.
    update_invite(invite, %{response: merge_response(invite.response, body)})
  end

  defp apply_platform_invite_status(invite, body) do
    # Unknown status - store body, no transition.
    update_invite(invite, %{response: merge_response(invite.response, body)})
  end

  defp merge_response(existing, new) when is_map(existing) and is_map(new) do
    Map.put(existing, "platform_invite", new)
  end

  defp merge_response(_existing, new), do: %{"platform_invite" => new}

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

  # When the SourceCraft platform confirms an invite acceptance, mirror the user's
  # platform identity (id + login) onto our User record so future checks and joins
  # can use it without round-tripping the platform.
  defp persist_platform_user(user_id, %{id: platform_id} = user_data) when is_binary(platform_id) and platform_id != "" do
    case Repo.get(User, user_id) do
      nil ->
        :ok

      user ->
        attrs = maybe_put(%{external_platform_id: platform_id}, :external_platform_login, Map.get(user_data, :login))

        user
        |> User.changeset(attrs)
        |> Repo.update()

        :ok
    end
  end

  defp persist_platform_user(_user_id, _user_data), do: :ok

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, _key, ""), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

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
