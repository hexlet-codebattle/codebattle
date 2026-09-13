defmodule CodebattleWeb.Live.Admin.EventIndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Event

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       events: Event.get_all(),
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <div class="cb-d-flex cb-justify-between cb-align-center cb-mb-4">
        <div>
          <h1 class="cb-mb-1 cb-text-white">Events</h1>
          <p class="cb-text cb-mb-0">Manage event definitions and open full CRUD actions.</p>
        </div>

        <a href={Routes.event_path(@socket, :new)} class="cb-btn cb-btn-success cb-rounded">
          <i class="bi bi-plus-lg"></i> New Event
        </a>
      </div>

      <div class="cb-table-responsive">
        <table class="cb-table cb-table-sm cb-mb-0">
          <%= if @events == [] do %>
            <tbody>
              <tr>
                <td colspan="7" class="cb-border-color cb-text-center cb-text cb-py-4">
                  No events yet.
                </td>
              </tr>
            </tbody>
          <% else %>
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color cb-border-bottom">ID</th>
                <th class="cb-border-color cb-border-bottom">Slug</th>
                <th class="cb-border-color cb-border-bottom">Title</th>
                <th class="cb-border-color cb-border-bottom">Type</th>
                <th class="cb-border-color cb-border-bottom">Stages</th>
                <th class="cb-border-color cb-border-bottom">Starts At</th>
                <th class="cb-border-color cb-border-bottom"></th>
              </tr>
            </thead>
            <tbody>
              <%= for event <- @events do %>
                <tr>
                  <td class="cb-align-middle cb-text-white cb-border-color">{event.id}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{event.slug || "–"}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{event.title || "–"}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{event.type || "–"}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {length(event.stages || [])}
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {event.starts_at || "–"}
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color text-end">
                    <div class="cb-btn-group btn-group-sm">
                      <a
                        href={"/admin/events/#{event.id}/dashboard"}
                        class="cb-btn cb-btn-outline-info"
                      >
                        Dashboard
                      </a>
                      <a
                        href={Routes.event_path(@socket, :show, event)}
                        class="cb-btn cb-btn-outline-secondary cb-btn-outline-secondary"
                      >
                        Show
                      </a>
                      <a
                        href={Routes.event_path(@socket, :edit, event)}
                        class="cb-btn cb-btn-outline-secondary cb-btn-outline-secondary"
                      >
                        Edit
                      </a>
                      <.link
                        href={Routes.event_path(@socket, :delete, event)}
                        method="delete"
                        data-confirm="Delete this event?"
                        class="cb-btn cb-btn-outline-danger"
                      >
                        Delete
                      </.link>
                    </div>
                  </td>
                </tr>
              <% end %>
            </tbody>
          <% end %>
        </table>
      </div>
    </div>
    """
  end
end
