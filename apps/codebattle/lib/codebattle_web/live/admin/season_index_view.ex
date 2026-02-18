defmodule CodebattleWeb.Live.Admin.Season.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Season

  @impl true
  def mount(_params, _session, socket) do
    seasons = Season.get_all()
    changeset = Season.changeset(%Season{})

    {:ok,
     assign(socket,
       seasons: seasons,
       changeset: changeset,
       show_form: false,
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("show_form", _params, socket) do
    changeset = Season.changeset(%Season{})
    {:noreply, assign(socket, show_form: true, changeset: changeset)}
  end

  def handle_event("hide_form", _params, socket) do
    {:noreply, assign(socket, show_form: false)}
  end

  def handle_event("validate", %{"season" => season_params}, socket) do
    changeset =
      %Season{}
      |> Season.changeset(season_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("create", %{"season" => season_params}, socket) do
    case Season.create(season_params) do
      {:ok, _season} ->
        seasons = Season.get_all()

        {:noreply,
         socket
         |> assign(seasons: seasons, show_form: false)
         |> put_flash(:info, "Season created successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("delete", %{"id" => id}, socket) do
    season = Season.get!(id)

    case Season.delete(season) do
      {:ok, _season} ->
        seasons = Season.get_all()

        {:noreply,
         socket
         |> assign(seasons: seasons)
         |> put_flash(:info, "Season deleted successfully")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to delete season")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="text-white">
          <i class="bi bi-calendar-range"></i> Season Management
        </h1>
        <button
          :if={!@show_form}
          class="btn btn-secondary cb-btn-secondary cb-rounded"
          phx-click="show_form"
        >
          <i class="bi bi-plus-circle"></i> New Season
        </button>
      </div>

      <%= if @show_form do %>
        <div class="card cb-card shadow-sm mb-4 border cb-border-color">
          <div class="card-header cb-bg-highlight-panel cb-border-color text-white">
            <div class="d-flex justify-content-between align-items-center">
              <span><i class="bi bi-plus-circle"></i> Create New Season</span>
              <button
                class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                phx-click="hide_form"
              >
                <i class="bi bi-x"></i> Cancel
              </button>
            </div>
          </div>
          <div class="card-body">
            <.form :let={f} for={@changeset} phx-change="validate" phx-submit="create" class="row g-3">
              <div class="col-md-6">
                {label(f, :name, class: "form-label")}
                {text_input(f, :name,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded",
                  placeholder: "e.g., Spring Season"
                )}
                {error_tag(f, :name)}
              </div>

              <div class="col-md-6">
                {label(f, :year, class: "form-label")}
                {number_input(f, :year,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded",
                  placeholder: "e.g., 2024"
                )}
                {error_tag(f, :year)}
              </div>

              <div class="col-md-6">
                {label(f, :starts_at, "Start Date", class: "form-label")}
                {date_input(f, :starts_at,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded"
                )}
                {error_tag(f, :starts_at)}
              </div>

              <div class="col-md-6">
                {label(f, :ends_at, "End Date", class: "form-label")}
                {date_input(f, :ends_at,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded"
                )}
                {error_tag(f, :ends_at)}
              </div>

              <div class="col-12">
                {submit("Create Season",
                  class: "btn btn-secondary cb-btn-secondary cb-rounded",
                  phx_disable_with: "Creating..."
                )}
              </div>
            </.form>
          </div>
        </div>
      <% end %>

      <div class="card cb-card shadow-sm border cb-border-color">
        <div class="card-body">
          <%= if @seasons == [] do %>
            <div class="text-center cb-text py-5">
              <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
              <p class="mt-3">No seasons found. Create your first season!</p>
            </div>
          <% else %>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="cb-text">
                  <tr>
                    <th class="cb-border-color border-bottom">ID</th>
                    <th class="cb-border-color border-bottom">Name</th>
                    <th class="cb-border-color border-bottom">Year</th>
                    <th class="cb-border-color border-bottom">Start Date</th>
                    <th class="cb-border-color border-bottom">End Date</th>
                    <th class="cb-border-color border-bottom">Duration</th>
                    <th class="cb-border-color border-bottom">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for season <- @seasons do %>
                    <tr>
                      <td class="text-white cb-border-color">{season.id}</td>
                      <td class="text-white cb-border-color"><strong>{season.name}</strong></td>
                      <td class="text-white cb-border-color">{season.year}</td>
                      <td class="text-white cb-border-color">
                        {Calendar.strftime(season.starts_at, "%b %d, %Y")}
                      </td>
                      <td class="text-white cb-border-color">
                        {Calendar.strftime(season.ends_at, "%b %d, %Y")}
                      </td>
                      <td class="text-white cb-border-color">
                        {Date.diff(season.ends_at, season.starts_at)} days
                      </td>
                      <td class="cb-border-color">
                        <div class="btn-group" role="group">
                          <a
                            href={Routes.admin_season_show_view_path(@socket, :show, season.id)}
                            class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary"
                          >
                            <i class="bi bi-eye"></i> View
                          </a>
                          <a
                            href={Routes.admin_season_edit_view_path(@socket, :edit, season.id)}
                            class="btn btn-sm btn-outline-secondary"
                          >
                            <i class="bi bi-pencil"></i> Edit
                          </a>
                          <button
                            class="btn btn-sm btn-outline-danger"
                            phx-click="delete"
                            phx-value-id={season.id}
                            data-confirm="Are you sure you want to delete this season?"
                          >
                            <i class="bi bi-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            </div>
          <% end %>
        </div>
      </div>
    </div>
    """
  end
end
