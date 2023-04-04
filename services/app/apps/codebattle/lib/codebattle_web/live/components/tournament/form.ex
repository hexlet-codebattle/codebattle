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
        <div class="form-row justify-content-between">
          <div class="col-8">
            <%= label(f, :name) %>
            <%= text_input(f, :name,
              class: "form-control",
              value: f.params["name"] || "My fancy tournament",
              maxlength: "42",
              required: true
            ) %>
            <%= error_tag(f, :name) %>
          </div>
          <div class="col-4">
            <%= label(f, :Type) %>
            <%= select(f, :type, Codebattle.Tournament.types(), class: "form-control") %>
            <%= error_tag(f, :type) %>
          </div>
        </div>
        <div class="form-row justify-content-between mt-3">
          <div class="col-4">
            <%= label(f, :access_type) %>
            <%= select(f, :access_type, Codebattle.Tournament.access_types(), class: "form-control") %>
            <%= error_tag(f, :access_type) %>
          </div>
          <div class="col-4">
            <%= label(f, :players_limit) %>
            <%= select(f, :players_limit, [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
              value: f.params["players_limit"] || 32,
              class: "form-control"
            ) %>
            <%= error_tag(f, :players_limit) %>
          </div>
          <div class="col-4">
            <label>Starts at (UTC)</label>
            <%= datetime_local_input(f, :starts_at,
              class: "form-control",
              required: true,
              value: f.params["starts_at"] || NaiveDateTime.utc_now()
            ) %>
            <%= error_tag(f, :starts_at) %>
          </div>
        </div>

        <div class="form-row justify-content-between mt-3">
          <div class="col-4">
            <%= label(f, :task_strategy) %>
            <%= select(f, :task_strategy, Codebattle.Tournament.task_strategies(),
              class: "form-control",
              value: f.params["task_strategy"] || f.data.task_strategy
            ) %>
            <%= error_tag(f, :task_strategy) %>
          </div>
          <div class="col-4">
            <%= label(f, :task_provider) %>
            <%= select(f, :task_provider, Codebattle.Tournament.task_providers(),
              class: "form-control",
              value: f.params["task_provider"] || f.data.task_provider
            ) %>
            <%= error_tag(f, :task_provider) %>
          </div>
          <%= if (f.params["task_provider"] == "level" || is_nil(f.params["task_provider"])) do %>
            <div class="col-4">
              <%= label(f, :level) %>
              <%= select(f, :level, Codebattle.Tournament.levels(),
                class: "form-control",
                value: f.params["level"] || f.data.level
              ) %>
              <%= error_tag(f, :level) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "task_pack") do %>
            <div class="col-4">
              <%= label(f, :task_pack_id) %>
              <%= number_input(f, :task_pack_id,
                value: f.params["task_pack_id"],
                class: "form-control"
              ) %>
              <%= error_tag(f, :task_pack_id) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "tags") do %>
            <div class="col-4">
              <%= label(f, :tags) %>
              <%= text_input(f, :tags,
                value: f.params["tags"],
                class: "form-control",
                placeholder: "strings,math"
              ) %>
              <%= error_tag(f, :tags) %>
            </div>
          <% end %>
        </div>

        <div class="form-row justify-content-between mt-3">
          <div class="col-4">
            <%= label(f, :default_language) %>
            <%= select(f, :default_language, @langs, class: "form-control") %>
            <%= error_tag(f, :default_language) %>
          </div>
          <div class="col-4">
            <%= label(f, :match_timeout_in_seconds) %>
            <%= number_input(
              f,
              :match_timeout_seconds,
              class: "form-control",
              value: f.params["match_timeout_seconds"] || "177",
              min: "1",
              max: "1000"
            ) %>
          </div>
        </div>
        <%= if f.params["type"] == "team" do %>
          <div class="form-row justify-content-between mt-3">
            <div class="col-4">
              <%= label(f, :team_1_name) %>
              <%= text_input(f, :team_1_name,
                maxlength: "17",
                class: "form-control",
                value: f.params["team_1_name"] || "Backend"
              ) %>
            </div>
            <div class="col-4">
              <%= label(f, :team_2_name) %>
              <%= text_input(f, :team_2_name,
                maxlength: "17",
                class: "form-control",
                value: f.params["team_2_name"] || "Frontend"
              ) %>
            </div>
            <div class="col-4">
              <%= label(f, :rounds_to_win) %>
              <%= select(f, :rounds_to_win, [1, 2, 3, 4, 5],
                value: f.params["rounds_to_win"] || 3,
                class: "form-control"
              ) %>
              <%= error_tag(f, :rounds_to_win) %>
            </div>
          </div>
        <% end %>
        <%= if f.params["type"] == "stairway" do %>
          <div class="form-row justify-content-between mt-3">
            <div class="col-4">
              <%= label(f, :rounds_limit) %>
              <%= select(f, :rounds_limit, [3, 5, 7], class: "form-control") %>
              <%= error_tag(f, :rounds_limit) %>
            </div>
          </div>
        <% end %>
        <%= submit("Create",
          phx_disable_with: "Creating...",
          class: "btn btn-primary my-4"
        ) %>
      </.form>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
