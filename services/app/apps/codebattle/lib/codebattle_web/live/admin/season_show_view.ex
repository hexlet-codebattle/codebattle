defmodule CodebattleWeb.Live.Admin.Season.ShowView do
  use CodebattleWeb, :live_view

  alias Codebattle.Season

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    season = Season.get!(id)
    changeset = Season.changeset(season)

    {:ok,
     assign(socket,
       season: season,
       changeset: changeset,
       editing: false,
       layout: {CodebattleWeb.LayoutView, :empty}
     )}
  end

  @impl true
  def handle_event("toggle_edit", _params, socket) do
    editing = !socket.assigns.editing
    changeset = Season.changeset(socket.assigns.season)
    {:noreply, assign(socket, editing: editing, changeset: changeset)}
  end

  def handle_event("validate", %{"season" => season_params}, socket) do
    changeset =
      socket.assigns.season
      |> Season.changeset(season_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("update", %{"season" => season_params}, socket) do
    case Season.update(socket.assigns.season, season_params) do
      {:ok, season} ->
        changeset = Season.changeset(season)

        {:noreply,
         socket
         |> assign(season: season, changeset: changeset, editing: false)
         |> put_flash(:info, "Season updated successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("delete", _params, socket) do
    case Season.delete(socket.assigns.season) do
      {:ok, _season} ->
        {:noreply,
         socket
         |> put_flash(:info, "Season deleted successfully")
         |> push_navigate(to: Routes.admin_season_index_view_path(socket, :index))}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to delete season")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container mt-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i class="bi bi-calendar-range"></i> Season Details
        </h1>
        <a
          href={Routes.admin_season_index_view_path(@socket, :index)}
          class="btn btn-outline-secondary"
        >
          <i class="bi bi-arrow-left"></i> Back to List
        </a>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-header bg-primary text-white">
          <div class="d-flex justify-content-between align-items-center">
            <span><i class="bi bi-info-circle"></i> Season Information</span>
            <button :if={!@editing} class="btn btn-sm btn-outline-light" phx-click="toggle_edit">
              <i class="bi bi-pencil"></i> Edit
            </button>
          </div>
        </div>
        <div class="card-body">
          <%= if @editing do %>
            <.form :let={f} for={@changeset} phx-change="validate" phx-submit="update" class="row g-3">
              <div class="col-md-6">
                {label(f, :name, class: "form-label")}
                {text_input(f, :name, class: "form-control")}
                {error_tag(f, :name)}
              </div>

              <div class="col-md-6">
                {label(f, :year, class: "form-label")}
                {number_input(f, :year, class: "form-control")}
                {error_tag(f, :year)}
              </div>

              <div class="col-md-6">
                {label(f, :starts_at, "Start Date", class: "form-label")}
                {date_input(f, :starts_at, class: "form-control")}
                {error_tag(f, :starts_at)}
              </div>

              <div class="col-md-6">
                {label(f, :ends_at, "End Date", class: "form-label")}
                {date_input(f, :ends_at, class: "form-control")}
                {error_tag(f, :ends_at)}
              </div>

              <div class="col-12">
                <div class="btn-group" role="group">
                  {submit("Save Changes", class: "btn btn-primary", phx_disable_with: "Saving...")}
                  <button type="button" class="btn btn-secondary" phx-click="toggle_edit">
                    Cancel
                  </button>
                </div>
              </div>
            </.form>
          <% else %>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">ID</label>
                <div class="fw-bold">{@season.id}</div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">Name</label>
                <div class="fw-bold">{@season.name}</div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">Year</label>
                <div class="fw-bold">{@season.year}</div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">Duration</label>
                <div class="fw-bold">
                  {Date.diff(@season.ends_at, @season.starts_at)} days
                </div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">Start Date</label>
                <div class="fw-bold">
                  {Calendar.strftime(@season.starts_at, "%B %d, %Y")}
                </div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label text-muted">End Date</label>
                <div class="fw-bold">
                  {Calendar.strftime(@season.ends_at, "%B %d, %Y")}
                </div>
              </div>

              <div class="col-12 mb-3">
                <label class="form-label text-muted">Status</label>
                <div>
                  <%= cond do %>
                    <% Date.compare(@season.starts_at, Date.utc_today()) == :gt -> %>
                      <span class="badge bg-info">
                        <i class="bi bi-clock"></i> Upcoming
                      </span>
                    <% Date.compare(@season.ends_at, Date.utc_today()) == :lt -> %>
                      <span class="badge bg-secondary">
                        <i class="bi bi-check-circle"></i> Completed
                      </span>
                    <% true -> %>
                      <span class="badge bg-success">
                        <i class="bi bi-play-circle"></i> Active
                      </span>
                  <% end %>
                </div>
              </div>
            </div>
          <% end %>
        </div>
      </div>

      <div :if={!@editing} class="card shadow-sm border-danger">
        <div class="card-header bg-danger text-white">
          <i class="bi bi-exclamation-triangle"></i> Danger Zone
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">
            Once you delete a season, there is no going back. Please be certain.
          </p>
          <button
            class="btn btn-danger"
            phx-click="delete"
            data-confirm="Are you sure you want to delete this season? This action cannot be undone."
          >
            <i class="bi bi-trash"></i> Delete Season
          </button>
        </div>
      </div>
    </div>
    """
  end
end
