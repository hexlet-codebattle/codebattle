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
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("update", %{"season" => season_params}, socket) do
    case Season.update(socket.assigns.season, season_params) do
      {:ok, season} ->
        changeset = Season.changeset(season)

        {:noreply,
         socket
         |> assign(season: season, changeset: changeset)
         |> put_flash(:info, "Season updated successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("cancel", _params, socket) do
    {:noreply, push_navigate(socket, to: Routes.admin_season_index_view_path(socket, :index))}
  end

  def handle_event(_event, _params, socket) do
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <div class="cb-d-flex cb-justify-between cb-align-center cb-mb-4">
        <h1 class="cb-text-white">
          <i class="bi bi-pencil-square"></i> Edit Season
        </h1>
        <a
          href={Routes.admin_season_index_view_path(@socket, :index)}
          class="cb-btn cb-btn-outline-secondary cb-rounded"
        >
          <i class="bi bi-arrow-left"></i> Back to List
        </a>
      </div>

      <div class="cb-card cb-shadow-sm cb-border cb-border-color">
        <div class="cb-card-header cb-bg-highlight-panel cb-border-color cb-text-white">
          <span><i class="bi bi-pencil"></i> Season Information</span>
        </div>
        <div class="cb-card-body">
          <.form :let={f} for={@changeset} phx-submit="update">
            <div class="cb-row g-3">
              <div class="cb-col-md-6">
                {label(f, :name, class: "form-label")}
                {text_input(f, :name,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded",
                  placeholder: "e.g., Spring Season"
                )}
                {error_tag(f, :name)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :year, class: "form-label")}
                {number_input(f, :year,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded",
                  placeholder: "e.g., 2024"
                )}
                {error_tag(f, :year)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :starts_at, "Start Date", class: "form-label")}
                {date_input(f, :starts_at,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded"
                )}
                {error_tag(f, :starts_at)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :ends_at, "End Date", class: "form-label")}
                {date_input(f, :ends_at,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded"
                )}
                {error_tag(f, :ends_at)}
              </div>

              <div class="cb-col-12">
                <div class="cb-btn-group" role="group">
                  {submit("Save Changes", class: "cb-btn cb-btn-secondary cb-rounded")}
                  <button
                    type="button"
                    class="cb-btn cb-btn-outline-secondary cb-rounded"
                    phx-click="cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </.form>
        </div>
      </div>

      <div class="cb-card cb-shadow-sm cb-mt-4 cb-border cb-border-color">
        <div class="cb-card-header cb-bg-highlight-panel cb-border-color cb-text-white">
          <span><i class="bi bi-info-circle"></i> Current Values</span>
        </div>
        <div class="cb-card-body">
          <div class="cb-row">
            <div class="cb-col-md-6 cb-mb-3">
              <label class="form-label cb-text">ID</label>
              <div class="fw-bold cb-text-white">{@season.id}</div>
            </div>

            <div class="cb-col-md-6 cb-mb-3">
              <label class="form-label cb-text">Duration</label>
              <div class="fw-bold cb-text-white">
                {Date.diff(@season.ends_at, @season.starts_at)} days
              </div>
            </div>

            <div class="cb-col-12 cb-mb-3">
              <label class="form-label cb-text">Status</label>
              <div>
                <%= cond do %>
                  <% Date.compare(@season.starts_at, Date.utc_today()) == :gt -> %>
                    <span class="cb-badge cb-bg-info">
                      <i class="bi bi-clock"></i> Upcoming
                    </span>
                  <% Date.compare(@season.ends_at, Date.utc_today()) == :lt -> %>
                    <span class="cb-badge cb-bg-secondary">
                      <i class="bi bi-check-circle"></i> Completed
                    </span>
                  <% true -> %>
                    <span class="cb-badge cb-bg-success">
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
