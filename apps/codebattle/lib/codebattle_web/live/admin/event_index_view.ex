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
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="mb-1 text-white">Events</h1>
          <p class="cb-text mb-0">Manage event definitions and open full CRUD actions.</p>
        </div>

        <a href={Routes.event_path(@socket, :new)} class="btn btn-success cb-rounded">
          <i class="bi bi-plus-lg"></i> New Event
        </a>
      </div>

      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <%= if @events == [] do %>
            <tbody>
              <tr>
                <td colspan="7" class="cb-border-color text-center cb-text py-4">No events yet.</td>
              </tr>
            </tbody>
          <% else %>
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color border-bottom">ID</th>
                <th class="cb-border-color border-bottom">Slug</th>
                <th class="cb-border-color border-bottom">Title</th>
                <th class="cb-border-color border-bottom">Type</th>
                <th class="cb-border-color border-bottom">Stages</th>
                <th class="cb-border-color border-bottom">Starts At</th>
                <th class="cb-border-color border-bottom"></th>
              </tr>
            </thead>
            <tbody>
              <%= for event <- @events do %>
                <tr>
                  <td class="align-middle text-white cb-border-color">{event.id}</td>
                  <td class="align-middle text-white cb-border-color">{event.slug || "–"}</td>
                  <td class="align-middle text-white cb-border-color">{event.title || "–"}</td>
                  <td class="align-middle text-white cb-border-color">{event.type || "–"}</td>
                  <td class="align-middle text-white cb-border-color">
                    {length(event.stages || [])}
                  </td>
                  <td class="align-middle text-white cb-border-color">{event.starts_at || "–"}</td>
                  <td class="align-middle text-white cb-border-color text-end">
                    <div class="btn-group btn-group-sm">
                      <a
                        href={Routes.event_path(@socket, :show, event)}
                        class="btn btn-outline-secondary cb-btn-outline-secondary"
                      >
                        Show
                      </a>
                      <a
                        href={Routes.event_path(@socket, :edit, event)}
                        class="btn btn-outline-secondary cb-btn-outline-secondary"
                      >
                        Edit
                      </a>
                      <.link
                        href={Routes.event_path(@socket, :delete, event)}
                        method="delete"
                        data-confirm="Delete this event?"
                        class="btn btn-outline-danger"
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
