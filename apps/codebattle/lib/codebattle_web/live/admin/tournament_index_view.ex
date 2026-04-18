defmodule CodebattleWeb.Live.Admin.TournamentIndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Tournament

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket), do: :timer.send_interval(5_000, self(), :refresh)

    {:ok,
     assign(socket,
       layout: {CodebattleWeb.LayoutView, :admin},
       tournaments: list_tournaments(),
       duplicate_result: nil
     )}
  end

  @impl true
  def handle_info(:refresh, socket) do
    {:noreply, assign(socket, :tournaments, list_tournaments())}
  end

  @impl true
  def handle_event("duplicate", %{"tournament_id" => tid, "count" => count}, socket) do
    with {id, ""} <- Integer.parse(String.trim(tid)),
         {cnt, ""} when cnt > 0 and cnt <= 100 <- Integer.parse(String.trim(count)),
         %Tournament{} = tournament <- Tournament.Context.get_from_db(id) do
      creator = socket.assigns.current_user

      case Tournament.Context.duplicate(tournament, creator, cnt) do
        {:ok, tournaments} ->
          {:noreply,
           assign(socket,
             tournaments: list_tournaments(),
             duplicate_result: {:ok, tournaments, tournament}
           )}

        {:error, errors} ->
          {:noreply,
           socket
           |> put_flash(:error, "Failed: #{inspect(errors)}")
           |> assign(:duplicate_result, nil)}
      end
    else
      _ ->
        {:noreply,
         socket
         |> put_flash(:error, "Invalid tournament ID or count")
         |> assign(:duplicate_result, nil)}
    end
  end

  @impl true
  def handle_event("cancel", %{"id" => id}, socket) do
    Tournament.Server.handle_event(String.to_integer(id), :cancel, %{})
    {:noreply, assign(socket, :tournaments, list_tournaments())}
  end

  defp list_tournaments do
    Tournament.Context.get_live_tournaments()
  end

  defp state_badge_class("waiting_participants"), do: "badge badge-warning"
  defp state_badge_class("active"), do: "badge badge-success"
  defp state_badge_class("finished"), do: "badge badge-secondary"
  defp state_badge_class(_), do: "badge badge-dark"

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-fluid px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4">
        <h1 class="text-white mb-2">Tournaments</h1>
        <p class="cb-text mb-4">
          Active: {Enum.count(@tournaments, &(&1.state == "active"))} | Waiting: {Enum.count(
            @tournaments,
            &(&1.state == "waiting_participants")
          )} | Total live: {length(@tournaments)}
        </p>

        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color border-bottom">ID</th>
                <th class="cb-border-color border-bottom">Name</th>
                <th class="cb-border-color border-bottom">State</th>
                <th class="cb-border-color border-bottom">Type</th>
                <th class="cb-border-color border-bottom">Players</th>
                <th class="cb-border-color border-bottom">Round</th>
                <th class="cb-border-color border-bottom">Starts At</th>
                <th class="cb-border-color border-bottom">Actions</th>
              </tr>
            </thead>
            <tbody>
              <%= if @tournaments == [] do %>
                <tr>
                  <td colspan="8" class="text-center cb-text py-4 cb-border-color">
                    No live tournaments
                  </td>
                </tr>
              <% end %>
              <%= for t <- @tournaments do %>
                <tr>
                  <td class="align-middle text-white cb-border-color">{t.id}</td>
                  <td class="align-middle text-white cb-border-color">{t.name}</td>
                  <td class="align-middle cb-border-color">
                    <span class={state_badge_class(t.state)}>{t.state}</span>
                  </td>
                  <td class="align-middle text-white cb-border-color">{t.type}</td>
                  <td class="align-middle text-white cb-border-color">{t.players_count}</td>
                  <td class="align-middle text-white cb-border-color">
                    {t.current_round_position}/{t.rounds_limit}
                  </td>
                  <td class="align-middle text-white cb-border-color">
                    {Calendar.strftime(t.starts_at, "%Y-%m-%d %H:%M")}
                  </td>
                  <td class="align-middle cb-border-color">
                    <a
                      href={"/tournaments/#{t.id}"}
                      class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                      target="_blank"
                    >
                      Open
                    </a>
                    <%= if t.state in ["waiting_participants", "active"] do %>
                      <button
                        phx-click="cancel"
                        phx-value-id={t.id}
                        data-confirm={"Cancel tournament ##{t.id} \"#{t.name}\"?"}
                        class="btn btn-sm btn-outline-danger cb-rounded ml-1"
                      >
                        Cancel
                      </button>
                    <% end %>
                  </td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4 mt-3">
        <h3 class="text-white mb-3">Duplicate Tournament</h3>
        <p class="cb-text mb-3">
          Enter a tournament ID and the number of copies to create.
          Each copy will have the same settings; token-based tournaments get fresh tokens.
        </p>
        <form phx-submit="duplicate" class="row align-items-end">
          <div class="col-md-4 mb-2">
            <label class="cb-text" for="tournament_id">Tournament ID</label>
            <input
              type="number"
              name="tournament_id"
              id="tournament_id"
              class="form-control cb-bg-highlight-panel cb-text cb-border-color"
              required
              min="1"
            />
          </div>
          <div class="col-md-4 mb-2">
            <label class="cb-text" for="count">Number of copies</label>
            <input
              type="number"
              name="count"
              id="count"
              class="form-control cb-bg-highlight-panel cb-text cb-border-color"
              required
              min="1"
              max="100"
              value="20"
            />
          </div>
          <div class="col-md-4 mb-2">
            <button type="submit" class="btn btn-success text-white cb-rounded">
              Duplicate
            </button>
          </div>
        </form>

        <%= if @duplicate_result do %>
          <% {:ok, created, source} = @duplicate_result %>
          <div class="mt-4">
            <h5 class="text-white">
              Created {length(created)} tournament(s) from "{source.name}" (ID: {source.id})
            </h5>
            <div class="table-responsive mt-2">
              <table class="table table-sm mb-0">
                <thead class="cb-text">
                  <tr>
                    <th class="cb-border-color border-bottom">ID</th>
                    <th class="cb-border-color border-bottom">Name</th>
                    <th class="cb-border-color border-bottom">Access</th>
                    <th class="cb-border-color border-bottom">Token</th>
                    <th class="cb-border-color border-bottom">Starts At</th>
                    <th class="cb-border-color border-bottom">Link</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for t <- created do %>
                    <tr>
                      <td class="align-middle text-white cb-border-color">{t.id}</td>
                      <td class="align-middle text-white cb-border-color">{t.name}</td>
                      <td class="align-middle text-white cb-border-color">{t.access_type}</td>
                      <td class="align-middle text-white cb-border-color">
                        {t.access_token || "—"}
                      </td>
                      <td class="align-middle text-white cb-border-color">{t.starts_at}</td>
                      <td class="align-middle cb-border-color">
                        <a
                          href={"/tournaments/#{t.id}"}
                          class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                          target="_blank"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
