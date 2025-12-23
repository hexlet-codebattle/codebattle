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
       layout: {CodebattleWeb.LayoutView, :empty}
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
    <div class="container mt-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i class="bi bi-calendar-range"></i> Season Management
        </h1>
        <button :if={!@show_form} class="btn btn-primary" phx-click="show_form">
          <i class="bi bi-plus-circle"></i> New Season
        </button>
      </div>

      <%= if @show_form do %>
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <span><i class="bi bi-plus-circle"></i> Create New Season</span>
              <button class="btn btn-sm btn-outline-light" phx-click="hide_form">
                <i class="bi bi-x"></i> Cancel
              </button>
            </div>
          </div>
          <div class="card-body">
            <.form :let={f} for={@changeset} phx-change="validate" phx-submit="create" class="row g-3">
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
                {submit("Create Season", class: "btn btn-primary", phx_disable_with: "Creating...")}
              </div>
            </.form>
          </div>
        </div>
      <% end %>

      <div class="card shadow-sm">
        <div class="card-body">
          <%= if @seasons == [] do %>
            <div class="text-center text-muted py-5">
              <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
              <p class="mt-3">No seasons found. Create your first season!</p>
            </div>
          <% else %>
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Year</th>
                    <th scope="col">Start Date</th>
                    <th scope="col">End Date</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for season <- @seasons do %>
                    <tr>
                      <td>{season.id}</td>
                      <td><strong>{season.name}</strong></td>
                      <td>{season.year}</td>
                      <td>{Calendar.strftime(season.starts_at, "%b %d, %Y")}</td>
                      <td>{Calendar.strftime(season.ends_at, "%b %d, %Y")}</td>
                      <td>
                        {Date.diff(season.ends_at, season.starts_at)} days
                      </td>
                      <td>
                        <div class="btn-group" role="group">
                          <a
                            href={Routes.admin_season_show_view_path(@socket, :show, season.id)}
                            class="btn btn-sm btn-outline-primary"
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
