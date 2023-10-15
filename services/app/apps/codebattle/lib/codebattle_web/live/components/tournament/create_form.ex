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
        class="col-10 offset-1"
      >
        <div class="form-group">
          <%= render_base_errors(@changeset.errors[:base]) %>
        </div>
        <div class="form-row justify-content-between">
          <div class="col-6 d-flex flex-column justify-content-between">
            <%= label(f, :name) %>
            <%= text_input(f, :name,
              class: "form-control",
              value: f.params["name"] || "My fancy tournament",
              maxlength: "42",
              required: true
            ) %>
            <%= error_tag(f, :name) %>
          </div>
          <div class="col-6 d-flex flex-column justify-content-between">
            <%= label(f, :Type) %>
            <%= select(f, :type, Codebattle.Tournament.types(), class: "form-control") %>
            <%= error_tag(f, :type) %>
          </div>
        </div>
        <div class="form-row justify-content-between mt-3">
          <div class="col-11 d-flex flex-column justify-content-between">
            <%= label(f, :description) %>
            <%= textarea(f, :description,
              class: "form-control",
              value:
                f.params["description"] ||
                  "Markdown description. [stream_link](https://codebattle.hexlet.io)",
              maxlength: "350",
              required: true
            ) %>
            <%= error_tag(f, :description) %>
          </div>
          <div class="col-1 d-flex flex-column justify-content-between">
            <%= label(f, :use_chat) %>
            <%= checkbox(f, :use_chat, class: "form-control") %>
            <%= error_tag(f, :use_chat) %>
          </div>
        </div>
        <div class="form-row justify-content-between mt-3">
          <div class="col-6 d-flex flex-column justify-content-between">
            <label>Starts at (<%= @user_timezone %>)</label>
            <%= datetime_local_input(f, :starts_at,
              class: "form-control",
              required: true,
              value: f.params["starts_at"] || DateTime.add(DateTime.now!(@user_timezone), 5, :minute)
            ) %>
            <%= error_tag(f, :starts_at) %>
          </div>
          <div class="col-6 d-flex flex-column justify-content-between">
            <%= label(f, :access_type) %>
            <%= select(f, :access_type, Codebattle.Tournament.access_types(), class: "form-control") %>
            <%= error_tag(f, :access_type) %>
          </div>
        </div>
        <div class="form-row justify-content-between mt-3">
          <div class="col-4 d-flex flex-column justify-content-between">
            <%= label(f, :task_strategy) %>
            <%= select(f, :task_strategy, Codebattle.Tournament.task_strategies(),
              class: "form-control",
              value: f.params["task_strategy"] || f.data.task_strategy
            ) %>
            <%= error_tag(f, :task_strategy) %>
          </div>
          <div class="col-4 d-flex flex-column justify-content-between">
            <%= label(f, :task_provider) %>
            <%= select(f, :task_provider, Codebattle.Tournament.task_providers(),
              class: "form-control",
              value: f.params["task_provider"] || f.data.task_provider
            ) %>
            <%= error_tag(f, :task_provider) %>
          </div>
          <%= if (f.params["task_provider"] == "level" || is_nil(f.params["task_provider"])) do %>
            <div class="col-4 d-flex flex-column justify-content-between">
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
              <%= label(f, :task_pack_name) %>
              <%= select(f, :task_pack_name, @task_pack_names,
                class: "form-control",
                value: f.params["task_pack_name"] || f.data.task_pack_name
              ) %>
              <%= error_tag(f, :task_pack_name) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "tags") do %>
            <div class="col-4">
              <%= label(f, :level) %>
              <%= select(f, :level, Codebattle.Tournament.levels(),
                class: "form-control",
                value: f.params["level"] || f.data.level
              ) %>
              <%= error_tag(f, :level) %>
            </div>
          <% end %>
        </div>
        <div class="form-row justify-content-between mt-3">
          <%= if (f.params["task_provider"] == "task_pack") do %>
            <div class="col-3">
              <%= label(f, :elementary) %>
              <%= number_input(
                f,
                :timeout_elementary_seconds,
                class: "form-control",
                value: f.params["timeout_elementary_seconds"] || "150",
                min: "1",
                max: "1000"
              ) %>
            </div>
            <div class="col-3">
              <%= label(f, :easy) %>
              <%= number_input(
                f,
                :timeout_easy_seconds,
                class: "form-control",
                value: f.params["timeout_easy_seconds"] || "250",
                min: "1",
                max: "1000"
              ) %>
            </div>
            <div class="col-3">
              <%= label(f, :medium) %>
              <%= number_input(
                f,
                :timeout_medium_seconds,
                class: "form-control",
                value: f.params["timeout_medium_seconds"] || "350",
                min: "1",
                max: "1000"
              ) %>
            </div>
            <div class="col-3">
              <%= label(f, :hard) %>
              <%= number_input(
                f,
                :timeout_hard_seconds,
                class: "form-control",
                value: f.params["timeout_hard_seconds"] || "450",
                min: "1",
                max: "1000"
              ) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "tags") do %>
            <div class="col-12">
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
          <div class="col-3 d-flex flex-column justify-content-between">
            <%= label(f, :players_limit) %>
            <%= select(f, :players_limit, [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
              value: f.params["players_limit"] || 64,
              class: "form-control"
            ) %>
            <%= error_tag(f, :players_limit) %>
          </div>
          <div class="col-3 d-flex flex-column justify-content-between">
            <%= label(f, :default_language) %>
            <%= select(f, :default_language, @langs, class: "form-control") %>
            <%= error_tag(f, :default_language) %>
          </div>
          <div class="col-3 d-flex flex-column justify-content-between">
            <%= label(f, :match_timeout_sec) %>
            <%= number_input(
              f,
              :match_timeout_seconds,
              class: "form-control",
              value: f.params["match_timeout_seconds"] || "177",
              min: "15",
              max: "1000"
            ) %>
          </div>
          <div class="col-3 d-flex flex-column justify-content-between">
            <%= label(f, :break_duration_sec) %>
            <%= number_input(
              f,
              :break_duration_seconds,
              class: "form-control",
              value: f.params["break_duration_seconds"] || "42",
              min: "0",
              max: "357"
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
              <%= select(f, :rounds_limit, [3, 4, 5, 6, 7], class: "form-control") %>
              <%= error_tag(f, :rounds_limit) %>
            </div>
          </div>
        <% end %>
        <%= if f.params["type"] == "swiss" do %>
          <div class="form-row justify-content-between mt-3">
            <div class="col-4">
              <%= label(f, :rounds_limit) %>
              <%= select(f, :rounds_limit, [3, 4, 5, 6, 7], class: "form-control") %>
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
