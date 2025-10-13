defmodule CodebattleWeb.Live.Tournament.CreateFormComponent do
  @moduledoc false
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
    <div class="container-xl cb-bg-panel shadow-lg cb-rounded py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-8">
          <h2 class="text-center mb-4 font-weight-bold text-white">Create a New Tournament</h2>

          <.form :let={f} for={@changeset} phx-change="validate" phx-submit="create" class="w-100">
            <!-- Base Errors -->
            <div class="form-group mb-4">
              <%= render_base_errors(@changeset.errors[:base]) %>
            </div>
            <!-- Basic Information -->
            <h4 class="mb-3 font-weight-semibold text-white border-bottom cb-border-color pb-2">
              Basic Information
            </h4>
            <!-- Tournament Name-->
            <div class="row mb-4">
              <div class="col-12 col-12">
                <div class="form-group">
                  <%= label(f, :name, class: "form-label font-weight-semibold text-white") %>
                  <%= text_input(f, :name,
                    class:
                      "form-control form-control-lg cb-bg-panel cb-border-color custom-control text-white",
                    value: f.params["name"] || "My fancy tournament",
                    maxlength: "42",
                    required: true
                  ) %>
                  <%= error_tag(f, :name) %>
                </div>
              </div>
            </div>
            <!-- Description -->
            <div class="form-group mb-4">
              <%= label(f, :description, class: "form-label font-weight-semibold text-white") %>
              <%= textarea(f, :description,
                class: "form-control cb-bg-panel cb-border-color text-white",
                value:
                  f.params["description"] ||
                    "Markdown description. [stream_link](https://codebattle.hexlet.io)",
                maxlength: "7531",
                rows: 8,
                required: true
              ) %>
              <%= error_tag(f, :description) %>
            </div>
            <!-- Schedule & Access -->
            <h4 class="mb-3 font-weight-semibold text-white border-bottom cb-border-color pb-2 mt-5">
              Schedule & Access
            </h4>
            <!-- Start Date & Access Type -->
            <div class="row mb-4">
              <div class="col-12 col-md-6">
                <div class="form-group">
                  <label class="form-label font-weight-semibold text-white">
                    Starts at (<%= @user_timezone %>)
                  </label>
                  <%= datetime_local_input(f, :starts_at,
                    class: "form-control form-control-lg cb-bg-panel cb-border-color text-white",
                    required: true,
                    min:
                      DateTime.now!(@user_timezone)
                      |> DateTime.truncate(:second)
                      |> Timex.format!("%Y-%m-%dT%H:%M", :strftime),
                    value:
                      f.params["starts_at"] || DateTime.add(DateTime.now!(@user_timezone), 5, :minute)
                  ) %>
                  <%= error_tag(f, :starts_at) %>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="form-group">
                  <%= label(f, :access_type, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :access_type, Codebattle.Tournament.access_types(),
                    class:
                      "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white"
                  ) %>
                  <%= error_tag(f, :access_type) %>
                </div>
              </div>
            </div>
            <!-- Features -->
            <h4 class="mb-3 font-weight-semibold text-white border-bottom cb-border-color pb-2 mt-5">
              Tournament Features
            </h4>
            <!-- Checkboxes -->
            <div class="row mb-4">
              <div class="col-12">
                <div class="d-flex flex-wrap">
                  <div class="form-check me-4 mb-2 pr-2">
                    <%= checkbox(f, :use_chat, class: "form-check-input") %>
                    <%= label(f, :use_chat, class: "form-check-label text-white") %>
                    <%= error_tag(f, :use_chat) %>
                  </div>
                  <div class="form-check mb-2 pr-2">
                    <%= checkbox(f, :use_clan, class: "form-check-input") %>
                    <%= label(f, :use_clan, class: "form-check-label text-white") %>
                    <%= error_tag(f, :use_clan) %>
                  </div>
                </div>
              </div>
            </div>
            <!-- Task Configuration -->
            <h4 class="mb-3 font-weight-semibold text-white border-bottom cb-border-color pb-2 mt-5">
              Task Configuration
            </h4>
            <!-- Task Configuration -->
            <div class="row mb-4">
              <div class="col-12 col-md-6">
                <div class="form-group">
                  <%= label(f, :task_strategy, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :task_strategy, Codebattle.Tournament.task_strategies(),
                    class:
                      "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                    value: f.params["task_strategy"] || f.data.task_strategy
                  ) %>
                  <%= error_tag(f, :task_strategy) %>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="form-group">
                  <%= label(f, :task_provider, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :task_provider, Codebattle.Tournament.task_providers(),
                    class:
                      "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                    value: f.params["task_provider"] || f.data.task_provider
                  ) %>
                  <%= error_tag(f, :task_provider) %>
                </div>
              </div>
            </div>
            <!-- Dynamic Task Provider Fields -->
            <div class="row mb-4">
              <%= if (f.params["task_provider"] == "level" || is_nil(f.params["task_provider"])) do %>
                <div class="col-12 col-md-4">
                  <div class="form-group">
                    <%= label(f, :level, class: "form-label text-white font-weight-semibold") %>
                    <%= select(f, :level, Codebattle.Task.levels(),
                      class:
                        "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                      value: f.params["level"] || f.data.level
                    ) %>
                    <%= error_tag(f, :level) %>
                  </div>
                </div>
              <% end %>
              <%= if (f.params["task_provider"] == "task_pack") do %>
                <div class="col-12 col-md-4">
                  <div class="form-group">
                    <%= label(f, :task_pack_name, class: "form-label text-white font-weight-semibold") %>
                    <%= select(f, :task_pack_name, @task_pack_names,
                      class:
                        "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                      value: f.params["task_pack_name"] || f.data.task_pack_name
                    ) %>
                    <%= error_tag(f, :task_pack_name) %>
                  </div>
                </div>
              <% end %>
              <%= if (f.params["task_provider"] == "tags") do %>
                <div class="col-12 col-md-4">
                  <div class="form-group">
                    <%= label(f, :level, class: "form-label text-white font-weight-semibold") %>
                    <%= select(f, :level, Codebattle.Task.levels(),
                      class:
                        "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                      value: f.params["level"] || f.data.level
                    ) %>
                    <%= error_tag(f, :level) %>
                  </div>
                </div>
              <% end %>
            </div>
            <!-- Tags Field -->
            <%= if (f.params["task_provider"] == "tags") do %>
              <div class="row mb-4">
                <div class="col-12">
                  <div class="form-group">
                    <%= label(f, :tags, class: "form-label text-white font-weight-semibold") %>
                    <%= text_input(f, :tags,
                      value: f.params["tags"],
                      class: "form-control form-control-lg cb-bg-panel cb-border-color text-white",
                      placeholder: "strings,math"
                    ) %>
                    <%= error_tag(f, :tags) %>
                  </div>
                </div>
              </div>
            <% end %>
            <!-- Tournament Settings -->
            <h4 class="mb-3 font-weight-semibold text-white border-bottom cb-border-color pb-2 mt-5">
              Tournament Settings
            </h4>
            <!-- Players & Timeouts -->
            <div class="row mb-4">
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :players_limit, class: "form-label text-white font-weight-semibold") %>
                  <%= select(
                    f,
                    :players_limit,
                    [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384],
                    value: f.params["players_limit"] || 64,
                    class:
                      "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white"
                  ) %>
                  <%= error_tag(f, :players_limit) %>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :ranking_type, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :ranking_type, Codebattle.Tournament.ranking_types(),
                    class:
                      "form-control form-control-lg custom-select cb-bg-panel cb-border-color text-white",
                    value: f.params["ranking_type"] || f.data.ranking_type
                  ) %>
                  <%= error_tag(f, :ranking_type) %>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :score_strategy, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :score_strategy, Codebattle.Tournament.score_strategies(),
                    class:
                      "form-control form-control-lg cb-bg-panel cb-border-color custom-select text-white",
                    value: f.params["score_strategy"] || f.data.score_strategy
                  ) %>
                  <%= error_tag(f, :score_strategy) %>
                </div>
              </div>
            </div>
            <!-- Rounds-->
            <div class="row mb-4">
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :rounds_limit, class: "form-label text-white font-weight-semibold") %>
                  <%= select(f, :rounds_limit, Enum.to_list(1..42),
                    class:
                      "form-control form-control-lg cb-bg-panel cb-border-color custom-control text-white",
                    value: f.params["rounds_limit"] || f.data.rounds_limit || "7"
                  ) %>
                  <%= error_tag(f, :rounds_limit) %>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :round_timeout_seconds,
                    class: "form-label text-white font-weight-semibold"
                  ) %>
                  <%= number_input(
                    f,
                    :round_timeout_seconds,
                    class:
                      "form-control form-control-lg cb-bg-panel cb-border-color custom-control text-white",
                    value: f.params["round_timeout_seconds"] || "177",
                    min: "100",
                    max: "10000"
                  ) %>
                  <%= error_tag(f, :round_timeout_seconds) %>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="form-group">
                  <%= label(f, :break_duration_seconds,
                    class: "form-label text-white font-weight-semibold text-white"
                  ) %>
                  <%= number_input(
                    f,
                    :break_duration_seconds,
                    class:
                      "form-control form-control-lg cb-bg-panel cb-border-color custom-control text-white",
                    value: f.params["break_duration_seconds"] || "42",
                    min: "0",
                    max: "100000"
                  ) %>
                  <%= error_tag(f, :break_duration_seconds) %>
                </div>
              </div>
            </div>
            <!-- Submit Button -->
            <div class="text-center mt-5">
              <%= submit("Create Tournament",
                phx_disable_with: "Creating...",
                class:
                  "btn btn-secondary cb-btn-secondary btn-lg px-5 py-3 rounded-pill font-weight-semibold shadow-sm"
              ) %>
            </div>
          </.form>
        </div>
      </div>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
