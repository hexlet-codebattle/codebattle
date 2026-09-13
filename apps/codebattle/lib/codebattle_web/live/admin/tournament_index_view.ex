defmodule CodebattleWeb.Live.Admin.TournamentIndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Simulator

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket), do: :timer.send_interval(5_000, self(), :refresh)

    {:ok,
     assign(socket,
       layout: {CodebattleWeb.LayoutView, :admin},
       tournaments: list_tournaments(),
       duplicate_result: nil,
       creating_simulation: false
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

  def handle_event("create_simulation", _params, socket) do
    socket =
      socket
      |> assign(:creating_simulation, true)
      |> start_async(:create_simulation, fn -> Simulator.Setup.create(%{}) end)

    {:noreply, socket}
  end

  @impl true
  def handle_async(:create_simulation, {:ok, {:ok, users}}, socket) do
    {:noreply,
     socket
     |> assign(:creating_simulation, false)
     |> put_flash(:info, "Loaded #{length(users)} Top200 simulator players from DB.")}
  end

  def handle_async(:create_simulation, {:ok, {:error, reason}}, socket) do
    {:noreply,
     socket
     |> assign(:creating_simulation, false)
     |> put_flash(:error, "Failed to create simulator: #{inspect(reason)}")}
  end

  def handle_async(:create_simulation, {:exit, reason}, socket) do
    {:noreply,
     socket
     |> assign(:creating_simulation, false)
     |> put_flash(:error, "Simulator creation crashed: #{inspect(reason)}")}
  end

  defp list_tournaments do
    Tournament.Context.get_live_tournaments()
  end

  defp state_badge_class("waiting_participants"), do: "cb-badge cb-badge-warning"
  defp state_badge_class("active"), do: "cb-badge cb-badge-success"
  defp state_badge_class("finished"), do: "cb-badge cb-badge-secondary"
  defp state_badge_class(_), do: "cb-badge cb-badge-dark"

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-fluid cb-px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color cb-border cb-shadow-sm cb-p-4">
        <h1 class="cb-text-white cb-mb-2">Tournaments</h1>
        <p class="cb-text cb-mb-4">
          Active: {Enum.count(@tournaments, &(&1.state == "active"))} | Waiting: {Enum.count(
            @tournaments,
            &(&1.state == "waiting_participants")
          )} | Total live: {length(@tournaments)}
        </p>

        <div class="cb-table-responsive">
          <table class="cb-table cb-table-sm cb-mb-0">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color cb-border-bottom">ID</th>
                <th class="cb-border-color cb-border-bottom">Name</th>
                <th class="cb-border-color cb-border-bottom">State</th>
                <th class="cb-border-color cb-border-bottom">Type</th>
                <th class="cb-border-color cb-border-bottom">Players</th>
                <th class="cb-border-color cb-border-bottom">Round</th>
                <th class="cb-border-color cb-border-bottom">Starts At</th>
                <th class="cb-border-color cb-border-bottom">Actions</th>
              </tr>
            </thead>
            <tbody>
              <%= if @tournaments == [] do %>
                <tr>
                  <td colspan="8" class="cb-text-center cb-text cb-py-4 cb-border-color">
                    No live tournaments
                  </td>
                </tr>
              <% end %>
              <%= for t <- @tournaments do %>
                <tr>
                  <td class="cb-align-middle cb-text-white cb-border-color">{t.id}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{t.name}</td>
                  <td class="cb-align-middle cb-border-color">
                    <span class={state_badge_class(t.state)}>{t.state}</span>
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{t.type}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{t.players_count}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {t.current_round_position}/{t.rounds_limit}
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {Calendar.strftime(t.starts_at, "%Y-%m-%d %H:%M")}
                  </td>
                  <td class="cb-align-middle cb-border-color">
                    <a
                      href={"/tournaments/#{t.id}"}
                      class="cb-btn cb-btn-sm cb-btn-outline-secondary cb-rounded"
                      target="_blank"
                    >
                      Open
                    </a>
                    <a
                      href={"/admin/tournaments/#{t.id}/stream"}
                      class="cb-btn cb-btn-sm cb-btn-outline-info cb-rounded cb-ml-1"
                      target="_blank"
                    >
                      Stream
                    </a>
                    <%= if t.state in ["waiting_participants", "active"] do %>
                      <button
                        phx-click="cancel"
                        phx-value-id={t.id}
                        data-confirm={"Cancel tournament ##{t.id} \"#{t.name}\"?"}
                        class="cb-btn cb-btn-sm cb-btn-outline-danger cb-rounded cb-ml-1"
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

      <div class="cb-bg-panel cb-rounded cb-border-color cb-border cb-shadow-sm cb-p-4 cb-mt-3">
        <h3 class="cb-text-white cb-mb-3">Top200 Simulator</h3>
        <p class="cb-text cb-mb-3">
          Inserts or updates 200 Top200 simulator players with fixed ids, names,
          ranks, languages, categories, and clans.
        </p>
        <button
          type="button"
          phx-click="create_simulation"
          data-confirm="Insert or update 200 Top200 simulator players?"
          disabled={@creating_simulation}
          class="cb-btn cb-btn-warning cb-text-white cb-rounded"
        >
          {if @creating_simulation,
            do: "Inserting…",
            else: "Insert Top200 Players"}
        </button>
      </div>

      <div class="cb-bg-panel cb-rounded cb-border-color cb-border cb-shadow-sm cb-p-4 cb-mt-3">
        <h3 class="cb-text-white cb-mb-3">Duplicate Tournament</h3>
        <p class="cb-text cb-mb-3">
          Enter a tournament ID and the number of copies to create.
          Each copy will have the same settings; token-based tournaments get fresh tokens.
        </p>
        <form phx-submit="duplicate" class="cb-row cb-align-end">
          <div class="cb-col-md-4 cb-mb-2">
            <label class="cb-text" for="tournament_id">Tournament ID</label>
            <input
              type="number"
              name="tournament_id"
              id="tournament_id"
              class="cb-form-control cb-bg-highlight-panel cb-text cb-border-color"
              required
              min="1"
            />
          </div>
          <div class="cb-col-md-4 cb-mb-2">
            <label class="cb-text" for="count">Number of copies</label>
            <input
              type="number"
              name="count"
              id="count"
              class="cb-form-control cb-bg-highlight-panel cb-text cb-border-color"
              required
              min="1"
              max="100"
              value="20"
            />
          </div>
          <div class="cb-col-md-4 cb-mb-2">
            <button type="submit" class="cb-btn cb-btn-success cb-text-white cb-rounded">
              Duplicate
            </button>
          </div>
        </form>

        <%= if @duplicate_result do %>
          <% {:ok, created, source} = @duplicate_result %>
          <div class="cb-mt-4">
            <h5 class="cb-text-white">
              Created {length(created)} tournament(s) from "{source.name}" (ID: {source.id})
            </h5>
            <div class="cb-table-responsive cb-mt-2">
              <table class="cb-table cb-table-sm cb-mb-0">
                <thead class="cb-text">
                  <tr>
                    <th class="cb-border-color cb-border-bottom">ID</th>
                    <th class="cb-border-color cb-border-bottom">Name</th>
                    <th class="cb-border-color cb-border-bottom">Access</th>
                    <th class="cb-border-color cb-border-bottom">Token</th>
                    <th class="cb-border-color cb-border-bottom">Starts At</th>
                    <th class="cb-border-color cb-border-bottom">Link</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for t <- created do %>
                    <tr>
                      <td class="cb-align-middle cb-text-white cb-border-color">{t.id}</td>
                      <td class="cb-align-middle cb-text-white cb-border-color">{t.name}</td>
                      <td class="cb-align-middle cb-text-white cb-border-color">{t.access_type}</td>
                      <td class="cb-align-middle cb-text-white cb-border-color">
                        {t.access_token || "—"}
                      </td>
                      <td class="cb-align-middle cb-text-white cb-border-color">{t.starts_at}</td>
                      <td class="cb-align-middle cb-border-color">
                        <a
                          href={"/tournaments/#{t.id}"}
                          class="cb-btn cb-btn-sm cb-btn-outline-secondary cb-rounded"
                          target="_blank"
                        >
                          Open
                        </a>
                        <a
                          href={"/admin/tournaments/#{t.id}/stream"}
                          class="cb-btn cb-btn-sm cb-btn-outline-info cb-rounded cb-ml-1"
                          target="_blank"
                        >
                          Stream
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
