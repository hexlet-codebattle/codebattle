defmodule CodebattleWeb.Live.Admin.Season.EditView do
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
       layout: {CodebattleWeb.LayoutView, :empty}
     )}
  end

  @impl true
  def handle_event("validate", %{"season" => season_params}, socket) do
    changeset =
      socket.assigns.season
      |> Season.changeset(season_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("update", %{"season" => season_params}, socket) do
    case Season.update(socket.assigns.season, season_params) do
      {:ok, _season} ->
        {:noreply,
         socket
         |> put_flash(:info, "Season updated successfully")
         |> push_navigate(to: Routes.admin_season_index_view_path(socket, :index))}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("cancel", _params, socket) do
    {:noreply, push_navigate(socket, to: Routes.admin_season_index_view_path(socket, :index))}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container mt-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i class="bi bi-pencil-square"></i> Edit Season
        </h1>
        <a
          href={Routes.admin_season_index_view_path(@socket, :index)}
          class="btn btn-outline-secondary"
        >
          <i class="bi bi-arrow-left"></i> Back to List
        </a>
      </div>

      <div class="card shadow-sm">
        <div class="card-header bg-primary text-white">
          <span><i class="bi bi-pencil"></i> Season Information</span>
        </div>
        <div class="card-body">
          <.form :let={f} for={@changeset} phx-change="validate" phx-submit="update" class="row g-3">
            <div class="col-md-6">
              {label(f, :name, class: "form-label")}
              {text_input(f, :name, class: "form-control", placeholder: "e.g., Spring Season")}
              {error_tag(f, :name)}
            </div>

            <div class="col-md-6">
              {label(f, :year, class: "form-label")}
              {number_input(f, :year, class: "form-control", placeholder: "e.g., 2024")}
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
                <button type="button" class="btn btn-secondary" phx-click="cancel">
                  Cancel
                </button>
              </div>
            </div>
          </.form>
        </div>
      </div>

      <div class="card shadow-sm mt-4">
        <div class="card-header bg-light">
          <span><i class="bi bi-info-circle"></i> Current Values</span>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label text-muted">ID</label>
              <div class="fw-bold">{@season.id}</div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label text-muted">Duration</label>
              <div class="fw-bold">
                {Date.diff(@season.ends_at, @season.starts_at)} days
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
        </div>
      </div>
    </div>
    """
  end
end
