defmodule CodebattleWeb.Live.Tournament.CreateFormComponent do
  use CodebattleWeb, :live_component
  import CodebattleWeb.ErrorHelpers

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl bg-white shadow-sm rounded py-4">
      <h2 class="text-center">Create a new tournament</h2>

      <.form
        :let={f}
        for={@changeset}
        phx-change="validate"
        phx-submit="create"
        class="col-8 offset-2"
      >
        <div class="form-group">
          <%= render_base_errors(@changeset.errors[:base]) %>
        </div>
        <div class="form-group">
          <%= label(f, :name) %>
          <%= text_input(f, :name,
            class: "form-control form-control-lg",
            value: f.params["name"] || "My fancy tournament",
            maxlength: "37",
            required: true
          ) %>
          <%= error_tag(f, :name) %>
        </div>
        <div class="form-row justify-content-between">
          <div class="form-group">
            <p class="mb-1">Type</p>
            <%= select(f, :type, Codebattle.Tournament.types(), class: "form-control
        form-control-lg") %>
            <%= error_tag(f, :type) %>
          </div>
          <div class="form-group">
            <p class="mb-1">Access Type</p>
            <%= select(f, :access_type, Codebattle.Tournament.access_types(),
              class: "form-control form-control-lg"
            ) %>
            <%= error_tag(f, :access_type) %>
          </div>
          <div class="form-group">
            <p class="mb-1">Starts at (UTC)</p>
            <%= datetime_local_input(f, :starts_at,
              class: "form-control form-control-lg",
              required: true,
              value: f.params["starts_at"] || NaiveDateTime.utc_now()
            ) %>
            <%= error_tag(f, :starts_at) %>
          </div>
        </div>

        <%= if f.params["type"] == "team" do %>
          <%= label(f, "Team names") %>
          <div class="form-row justify-content-between">
            <div class="from-group">
              <%= text_input(f, :team_1_name,
                maxlength: "17",
                class: "form-control form-control-lg",
                value: f.params["team_1_name"] || "Backend"
              ) %>
            </div>
            <div class="from-group">
              <%= text_input(f, :team_2_name,
                maxlength: "17",
                class: "form-control form-control-lg",
                value: f.params["team_2_name"] || "Frontend"
              ) %>
            </div>
          </div>
          <div class="from-group">
            <%= label(f, :rounds_to_win) %>
            <%= select(f, :rounds_to_win, [1, 2, 3, 4, 5],
              value: f.params["rounds_to_win"] || 3,
              class: "form-control form-control-lg"
            ) %>
            <%= error_tag(f, :rounds_to_win) %>
          </div>
        <% end %>

        <div class="form-row justify-content-between">
          <%= if f.params["type"] == "stairway" do %>
            <div class="form-group">
              <%= label(f, :task_pack_name) %>
              <%= select(f, :task_pack_name, @task_pack_names,
                class: "form-control form-control-lg",
                value: f.params["task_pack_name"],
                required: true
              ) %>
              <%= error_tag(f, :task_pack_name) %>
            </div>
          <% end %>
          <%= if f.params["type"] != "stairway" do %>
            <div class="form-group">
              <%= label(f, :level) %>
              <%= select(f, :level, Codebattle.Tournament.levels(),
                class: "form-control form-control-lg"
              ) %>
              <%= error_tag(f, :level) %>
            </div>
          <% end %>
          <div class="form-group">
            <%= label(f, :players_limit) %>
            <%= select(f, :players_limit, [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
              value: f.params["players_limit"] || 32,
              class: "form-control form-control-lg"
            ) %>
            <%= error_tag(f, :players_limit) %>
          </div>
          <div class="form-group">
            <%= label(f, :default_language) %>
            <%= select(f, :default_language, @langs, class: "form-control form-control-lg") %>
            <%= error_tag(f, :default_language) %>
          </div>
          <div class="form-group">
            <%= label(f, :match_timeout_in_seconds) %>
            <%= number_input(
              f,
              :match_timeout_seconds,
              class: "form-control form-control-lg",
              value: f.params["match_timeout_seconds"] || "177",
              min: "1",
              max: "1000"
            ) %>
          </div>
        </div>
        <%= submit("Create",
          phx_disable_with: "Creating...",
          class: "btn btn-primary mb-2"
        ) %>
      </.form>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
