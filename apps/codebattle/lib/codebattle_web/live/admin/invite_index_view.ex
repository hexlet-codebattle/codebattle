defmodule CodebattleWeb.Live.Admin.InviteIndexView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.ExternalPlatformInvite
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.Repo
  alias Codebattle.Workers.PlatformInviteAdvancerWorker

  require Logger

  @non_terminal_states ~w(pending creating invited)
  @valid_states ~w(pending creating invited accepted failed expired)
  @valid_sorts ~w(updated_at state user_id)

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       invites: list_invites("updated_at", nil),
       state_filter: nil,
       sort_by: "updated_at",
       counts: state_counts(),
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("reload", _params, socket) do
    {:noreply,
     assign(socket,
       invites: list_invites(socket.assigns.sort_by, socket.assigns.state_filter),
       counts: state_counts()
     )}
  end

  def handle_event("filter", %{"state" => state}, socket) do
    state_filter = if state in @valid_states, do: state

    {:noreply,
     assign(socket,
       state_filter: state_filter,
       invites: list_invites(socket.assigns.sort_by, state_filter)
     )}
  end

  def handle_event("sort", %{"by" => by}, socket) do
    sort_by = if by in @valid_sorts, do: by, else: "updated_at"

    {:noreply,
     assign(socket,
       sort_by: sort_by,
       invites: list_invites(sort_by, socket.assigns.state_filter)
     )}
  end

  def handle_event("retry_invite", %{"id" => id}, socket) do
    invite = ExternalPlatformInvite |> Repo.get!(id) |> Repo.preload(:user)
    alias_name = invite.user.external_oauth_login || invite.user.name

    flash =
      case InviteContext.send_invite(invite, alias_name) do
        {:ok, updated} ->
          PlatformInviteAdvancerWorker.enqueue(updated)
          {:info, "Retry enqueued for invite #{updated.id} (state=#{updated.state})"}

        {:error, reason} ->
          {:error, "Retry failed for invite #{invite.id}: #{inspect(reason)}"}
      end

    {:noreply,
     socket
     |> put_flash(elem(flash, 0), elem(flash, 1))
     |> assign(
       invites: list_invites(socket.assigns.sort_by, socket.assigns.state_filter),
       counts: state_counts()
     )}
  end

  def handle_event("poll_all_non_terminal", _params, socket) do
    invites =
      ExternalPlatformInvite
      |> where([i], i.state in @non_terminal_states)
      |> Repo.all()

    Enum.each(invites, &PlatformInviteAdvancerWorker.enqueue/1)

    {:noreply,
     socket
     |> put_flash(:info, "Enqueued advancer for #{length(invites)} non-terminal invite(s).")
     |> assign(
       invites: list_invites(socket.assigns.sort_by, socket.assigns.state_filter),
       counts: state_counts()
     )}
  end

  defp list_invites(sort_by, state_filter) do
    ExternalPlatformInvite
    |> apply_filter(state_filter)
    |> apply_sort(sort_by)
    |> preload([:user, :group_tournament])
    |> Repo.all()
  end

  defp apply_filter(query, nil), do: query
  defp apply_filter(query, state), do: where(query, [i], i.state == ^state)

  defp apply_sort(query, "state"), do: order_by(query, [i], asc: i.state, desc: i.updated_at)
  defp apply_sort(query, "user_id"), do: order_by(query, [i], asc: i.user_id, desc: i.updated_at)
  defp apply_sort(query, _), do: order_by(query, [i], desc: i.updated_at)

  defp state_counts do
    from(i in ExternalPlatformInvite,
      group_by: i.state,
      select: {i.state, count(i.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  defp invite_state_badge("pending"), do: "badge bg-secondary"
  defp invite_state_badge("creating"), do: "badge bg-info text-dark"
  defp invite_state_badge("invited"), do: "badge bg-primary"
  defp invite_state_badge("accepted"), do: "badge bg-success"
  defp invite_state_badge("failed"), do: "badge bg-danger"
  defp invite_state_badge("expired"), do: "badge bg-warning text-dark"
  defp invite_state_badge(_), do: "badge bg-secondary"

  defp format_dt(nil), do: "–"

  defp format_dt(%NaiveDateTime{} = dt) do
    dt |> DateTime.from_naive!("UTC") |> format_dt()
  end

  defp format_dt(%DateTime{} = dt) do
    Calendar.strftime(dt, "%Y-%m-%d %H:%M")
  end

  defp user_display(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp user_display(%{name: name}) when is_binary(name) and name != "", do: name
  defp user_display(_), do: "—"

  defp error_summary(%{response: %{"error" => %{"message" => msg}}}) when is_binary(msg), do: msg
  defp error_summary(%{response: %{"error" => err}}) when is_binary(err), do: err
  defp error_summary(_), do: nil

  defp non_terminal_total(counts) do
    Enum.reduce(@non_terminal_states, 0, fn s, acc -> acc + Map.get(counts, s, 0) end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="text-white mb-0">
          <i class="bi bi-envelope"></i>
          External Platform Invites <span class="badge bg-secondary ms-2">{length(@invites)}</span>
        </h1>
        <div class="d-flex gap-2">
          <button
            class="btn btn-warning cb-rounded"
            phx-click="poll_all_non_terminal"
            data-confirm={"Enqueue advancer for #{non_terminal_total(@counts)} non-terminal invite(s)?"}
          >
            <i class="bi bi-arrow-clockwise"></i>
            Poll All Non-Terminal ({non_terminal_total(@counts)})
          </button>
          <button class="btn btn-secondary cb-btn-secondary cb-rounded" phx-click="reload">
            Reload
          </button>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
        <div class="d-flex gap-1 align-items-center">
          <span class="cb-text small">Filter:</span>
          <button
            class={"btn btn-sm cb-rounded #{if is_nil(@state_filter), do: "btn-light", else: "btn-outline-light"}"}
            phx-click="filter"
            phx-value-state=""
          >
            All
          </button>
          <%= for state <- valid_states() do %>
            <button
              class={"btn btn-sm cb-rounded #{if @state_filter == state, do: "btn-light", else: "btn-outline-light"}"}
              phx-click="filter"
              phx-value-state={state}
            >
              {state} ({Map.get(@counts, state, 0)})
            </button>
          <% end %>
        </div>

        <div class="d-flex gap-1 align-items-center ms-auto">
          <span class="cb-text small">Sort:</span>
          <button
            class={"btn btn-sm cb-rounded #{if @sort_by == "updated_at", do: "btn-light", else: "btn-outline-light"}"}
            phx-click="sort"
            phx-value-by="updated_at"
          >
            updated_at
          </button>
          <button
            class={"btn btn-sm cb-rounded #{if @sort_by == "state", do: "btn-light", else: "btn-outline-light"}"}
            phx-click="sort"
            phx-value-by="state"
          >
            state
          </button>
          <button
            class={"btn btn-sm cb-rounded #{if @sort_by == "user_id", do: "btn-light", else: "btn-outline-light"}"}
            phx-click="sort"
            phx-value-by="user_id"
          >
            user_id
          </button>
        </div>
      </div>

      <%= if @invites == [] do %>
        <p class="text-white mb-0">No invites.</p>
      <% else %>
        <div class="table-responsive">
          <table class="table table-sm table-dark table-bordered align-middle">
            <thead>
              <tr class="cb-text small">
                <th>ID</th>
                <th>User</th>
                <th>Tournament</th>
                <th>State</th>
                <th>Operation ID</th>
                <th>Invite Link</th>
                <th>Updated</th>
                <th>Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <%= for invite <- @invites do %>
                <tr>
                  <td class="text-white">{invite.id}</td>
                  <td class="text-white">
                    <a href={"/admin/users/#{invite.user_id}"} class="text-info">
                      #{invite.user_id} {user_display(invite.user)}
                    </a>
                  </td>
                  <td class="text-white">
                    <%= if invite.group_tournament do %>
                      <a
                        href={"/admin/group_tournaments/#{invite.group_tournament_id}"}
                        class="text-info"
                      >
                        {invite.group_tournament.name}
                      </a>
                    <% else %>
                      <span class="cb-text">–</span>
                    <% end %>
                  </td>
                  <td>
                    <span class={invite_state_badge(invite.state)}>{invite.state}</span>
                  </td>
                  <td class="text-white small text-break" style="max-width: 180px;">
                    {invite.operation_id || "–"}
                  </td>
                  <td class="small" style="max-width: 240px;">
                    <%= if invite.invite_link do %>
                      <a
                        href={invite.invite_link}
                        target="_blank"
                        rel="noopener"
                        class="text-info text-break"
                      >
                        {invite.invite_link}
                      </a>
                    <% else %>
                      <span class="cb-text">–</span>
                    <% end %>
                  </td>
                  <td class="text-white small">{format_dt(invite.updated_at)}</td>
                  <td class="text-danger small text-break" style="max-width: 280px;">
                    {error_summary(invite) || ""}
                  </td>
                  <td class="text-nowrap">
                    <%= if invite.state == "failed" do %>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-warning cb-rounded"
                        phx-click="retry_invite"
                        phx-value-id={invite.id}
                        data-confirm="Retry this invite?"
                      >
                        Retry
                      </button>
                    <% end %>
                  </td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>
    </div>
    """
  end

  defp valid_states, do: @valid_states
end
