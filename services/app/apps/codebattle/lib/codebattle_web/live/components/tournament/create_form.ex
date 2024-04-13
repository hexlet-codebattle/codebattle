defmodule CodebattleWeb.Live.Tournament.CreateFormComponent do
  use CodebattleWeb, :live_component
  import CodebattleWeb.ErrorHelpers

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    assigns =
      assigns
      |> assign(
        :default_rounds_config_json,
        """
          [{"award": "red"}, {"award": "red"}, {"award": "blue"}]
        """
      )
      |> assign(:default_game_passwords_json, ~S(["12341234", "33322233", "11112222"]))

    ~H"""
    <div class="container-xl bg-white shadow-sm rounded py-4">
      <h2 class="text-center">Create a new tournament</h2>
      <.form
        :let={f}
        for={@changeset}
        phx-change="validate"
        phx-submit="create"
        class="col-12 col-md-10 col-lg-10 col-xl-10 offset-md-1 offset-lg-1 offset-xl-1"
      >
        <div class="form-group">
          <%= render_base_errors(@changeset.errors[:base]) %>
        </div>
        <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between">
          <div class="d-flex flex-column justify-content-between w-100">
            <%= label(f, :name) %>
            <%= text_input(f, :name,
              class: "form-control",
              value: f.params["name"] || "My fancy tournament",
              maxlength: "42",
              required: true
            ) %>
            <%= error_tag(f, :name) %>
          </div>
          <div class="d-flex flex-column justify-content-between w-100 ml-md-3 ml-lg-3 ml-xl-3">
            <%= label(f, :type) %>
            <%= select(f, :type, Codebattle.Tournament.types(), class: "custom-select") %>
            <%= error_tag(f, :type) %>
          </div>
        </div>
        <div class="mt-3">
          <div class="d-flex flex-column justify-content-between w-auto">
            <%= label(f, :description) %>
            <%= textarea(f, :description,
              class: "form-control",
              value:
                f.params["description"] ||
                  "Markdown description. [stream_link](https://codebattle.hexlet.io)",
              maxlength: "7531",
              rows: 20,
              cols: 50,
              required: true
            ) %>
            <%= error_tag(f, :description) %>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row mt-3">
          <div class="d-flex flex-column justify-content-between w-auto">
            <label>Starts at (<%= @user_timezone %>)</label>
            <%= datetime_local_input(f, :starts_at,
              class: "form-control",
              required: true,
              value: f.params["starts_at"] || DateTime.add(DateTime.now!(@user_timezone), 5, :minute)
            ) %>
            <%= error_tag(f, :starts_at) %>
          </div>
          <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
            <%= label(f, :access_type) %>
            <%= select(f, :access_type, Codebattle.Tournament.access_types(), class: "custom-select") %>
            <%= error_tag(f, :access_type) %>
          </div>
          <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
            <%= label(f, :task_strategy) %>
            <%= select(f, :task_strategy, Codebattle.Tournament.task_strategies(),
              class: "custom-select",
              value: f.params["task_strategy"] || f.data.task_strategy
            ) %>
            <%= error_tag(f, :task_strategy) %>
          </div>
          <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
            <%= label(f, :score_strategy) %>
            <%= select(f, :score_strategy, Codebattle.Tournament.score_strategies(),
              class: "custom-select",
              value: f.params["score_strategy"] || f.data.score_strategy
            ) %>
            <%= error_tag(f, :score_strategy) %>
          </div>
        </div>
        <div class="d-flex mt-3">
          <div class="form-check">
            <%= checkbox(f, :use_chat, class: "form-check-input") %>
            <%= label(f, :use_chat, class: "form-check-label") %>
            <%= error_tag(f, :use_chat) %>
          </div>
          <div class="form-check ml-3">
            <%= checkbox(f, :use_timer, class: "form-check-input") %>
            <%= label(f, :use_timer, class: "form-check-label") %>
            <%= error_tag(f, :use_timer) %>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row mt-3">
          <div class="d-flex flex-column justify-content-between w-auto">
            <%= label(f, :task_provider) %>
            <%= select(f, :task_provider, Codebattle.Tournament.task_providers(),
              class: "custom-select",
              value: f.params["task_provider"] || f.data.task_provider
            ) %>
            <%= error_tag(f, :task_provider) %>
          </div>
          <%= if (f.params["task_provider"] == "level" || is_nil(f.params["task_provider"])) do %>
            <div class="d-flex flex-column justify-content-between ml-md-2 ml-lg-2 ml-xl-2 w-auto">
              <%= label(f, :level) %>
              <%= select(f, :level, Codebattle.Tournament.levels(),
                class: "custom-select",
                value: f.params["level"] || f.data.level
              ) %>
              <%= error_tag(f, :level) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "task_pack") do %>
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :task_pack_name) %>
              <%= select(f, :task_pack_name, @task_pack_names,
                class: "custom-select",
                value: f.params["task_pack_name"] || f.data.task_pack_name
              ) %>
              <%= error_tag(f, :task_pack_name) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "task_pack_per_round") do %>
            <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
              <%= label(f, :task_pack_name) %>
              <%= text_input(f, :task_pack_name,
                class: "form-control",
                value: f.params["task_pack_name"] || f.data.task_pack_name,
                placeholder: "all_easy,all_medium"
              ) %>
              <%= error_tag(f, :task_pack_names) %>
            </div>
          <% end %>
          <%= if (f.params["task_provider"] == "tags") do %>
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :level) %>
              <%= select(f, :level, Codebattle.Tournament.levels(),
                class: "custom-select",
                value: f.params["level"] || f.data.level
              ) %>
              <%= error_tag(f, :level) %>
            </div>
          <% end %>
        </div>
        <div class="justify-content-between mt-3">
          <%= if (f.params["task_provider"] == "tags") do %>
            <div class="">
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

        <div class="d-flex flex-column flex-lg-row flex-xl-row mt-3">
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row">
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :players_limit) %>
              <%= select(
                f,
                :players_limit,
                [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384],
                value: f.params["players_limit"] || 64,
                class: "custom-select"
              ) %>
              <%= error_tag(f, :players_limit) %>
            </div>
            <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
              <%= label(f, :default_language) %>
              <%= select(f, :default_language, @langs, class: "custom-select") %>
              <%= error_tag(f, :default_language) %>
            </div>
          </div>
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row mt-md-3 mt-lg-0 mt-xl-0">
            <div class="d-flex flex-column justify-content-between w-auto ml-lg-2 ml-xl-2">
              <%= label(f, :match_timeout_seconds) %>
              <%= number_input(
                f,
                :match_timeout_seconds,
                class: "form-control",
                value: f.params["match_timeout_seconds"] || "177",
                min: "7",
                max: "10000"
              ) %>
            </div>
            <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
              <%= label(f, :break_duration_seconds) %>
              <%= number_input(
                f,
                :break_duration_seconds,
                class: "form-control",
                value: f.params["break_duration_seconds"] || "42",
                min: "0",
                max: "100000"
              ) %>
            </div>
          </div>
        </div>
        <%= if f.params["type"] == "team" do %>
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row mt-3">
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :team_1_name) %>
              <%= text_input(f, :team_1_name,
                maxlength: "17",
                class: "form-control",
                value: f.params["team_1_name"] || "Backend"
              ) %>
            </div>
            <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
              <%= label(f, :team_2_name) %>
              <%= text_input(f, :team_2_name,
                maxlength: "17",
                class: "form-control",
                value: f.params["team_2_name"] || "Frontend"
              ) %>
            </div>
            <div class="d-flex flex-column justify-content-between w-auto ml-md-2 ml-lg-2 ml-xl-2">
              <%= label(f, :rounds_to_win) %>
              <%= select(f, :rounds_to_win, [1, 2, 3, 4, 5],
                value: f.params["rounds_to_win"] || 3,
                class: "custom-select"
              ) %>
              <%= error_tag(f, :rounds_to_win) %>
            </div>
          </div>
        <% end %>
        <%= if f.params["type"] in ["arena", "swiss"] do %>
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between mt-3">
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :rounds_limit) %>
              <%= select(f, :rounds_limit, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 137, 200],
                class: "custom-select"
              ) %>
              <%= error_tag(f, :rounds_limit) %>
            </div>
          </div>
        <% end %>
        <%= if f.params["type"] in ["arena"] do %>
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between mt-3">
            <div class="d-flex flex-column justify-content-between w-auto">
              <%= label(f, :round_timeout_seconds) %>
              <%= number_input(
                f,
                :round_timeout_seconds,
                class: "form-control",
                value: f.params["round_timeout_seconds"] || "177",
                min: "100",
                max: "10000"
              ) %>
              <%= error_tag(f, :round_timeout_seconds) %>
            </div>
          </div>
        <% end %>
        <%= if f.params["type"] in ["arena"] do %>
          <div class="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between mt-3">
            <div class="form-check">
              <%= checkbox(f, :use_clan, class: "form-check-input") %>
              <%= label(f, :use_clan, class: "form-check-label") %>
              <%= error_tag(f, :use_clan) %>
            </div>
          </div>
        <% end %>
        <%= if (f.params["type"] == "show") do %>
          <div class="d-flex mt-3 overflow-x">
            <%= label(f, :game_passwords_json) %>
            <%= textarea(f, :game_passwords_json,
              class: "form-control",
              value: f.params["game_passwords_json"] || @default_game_passwords_json,
              maxlength: "9350",
              rows: "10"
            ) %>
            <%= error_tag(f, :game_passwords_json) %>
          </div>
        <% end %>
        <%= submit("Create",
          phx_disable_with: "Creating...",
          class: "btn btn-primary rounded-lg my-4"
        ) %>
      </.form>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
