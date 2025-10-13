defmodule CodebattleWeb.Live.Tournament.EditFormComponent do
  @moduledoc false
  use CodebattleWeb, :live_component

  import CodebattleWeb.ErrorHelpers

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4">
      <h2 class="text-center mb-2 text-white">Edit Tournament</h2>
      <h3 class="text-center mb-4 text-white">
        Creator:
        <a
          href={Routes.user_path(@socket, :show, @tournament.creator.id)}
          class="text-decoration-none cb-text"
        >
          <%= @tournament.creator.name %>
        </a>
      </h3>

      <.form
        :let={f}
        for={@changeset}
        phx-change="validate"
        phx-submit="update"
        class="col-12 col-md-10 col-lg-8 offset-md-1 offset-lg-2"
      >
        <%= hidden_input(f, :tournament_id, value: @tournament.id) %>

        <div class="form-group">
          <%= render_base_errors(@changeset.errors[:base]) %>
        </div>
        <!-- Basic Information Section -->
        <div class="card cb-card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Basic Information</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-12 mb-3">
                <%= label(f, :name, class: "form-label text-white") %>
                <%= text_input(f, :name,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  maxlength: "42",
                  required: true
                ) %>
                <%= error_tag(f, :name) %>
              </div>
              <div class="col-12">
                <%= label(f, :description, class: "form-label text-white") %>
                <%= textarea(f, :description,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  maxlength: "7531",
                  rows: 8,
                  required: true
                ) %>
                <%= error_tag(f, :description) %>
              </div>
            </div>
          </div>
        </div>
        <!-- Tournament Settings Section -->
        <div class="card cb-card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Tournament Settings</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-4 mb-3">
                <label class="form-label text-white">Starts at (<%= @user_timezone %>)</label>
                <%= datetime_local_input(f, :starts_at,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  value:
                    DateTime.from_naive!(
                      Timex.parse!(f.params["starts_at"], "{ISO:Extended}"),
                      @user_timezone
                    ),
                  required: true
                ) %>
                <%= error_tag(f, :starts_at) %>
              </div>
            </div>
            <div class="row">
              <div class="col-md-4 mb-3">
                <%= label(f, :access_type, class: "form-label text-white") %>
                <%= select(f, :access_type, Codebattle.Tournament.access_types(),
                  class: "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                ) %>
                <%= error_tag(f, :access_type) %>
              </div>
              <div class="col-md-4 mb-3">
                <%= label(f, :task_strategy, class: "form-label text-white") %>
                <%= select(f, :task_strategy, Codebattle.Tournament.task_strategies(),
                  class: "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                ) %>
                <%= error_tag(f, :task_strategy) %>
              </div>
            </div>

            <div class="row">
              <div class="col-12 mb-3">
                <label class="form-label text-white">Tournament Features</label>
                <div class="d-flex gap-4">
                  <div class="form-check">
                    <%= checkbox(f, :use_chat, class: "form-check-input") %>
                    <%= label(f, :use_chat, class: "form-check-label text-white pl-2") %>
                    <%= error_tag(f, :use_chat) %>
                  </div>
                  <div class="form-check">
                    <%= checkbox(f, :use_clan, class: "form-check-input") %>
                    <%= label(f, :use_clan, class: "form-check-label text-white pl-2") %>
                    <%= error_tag(f, :use_clan) %>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Task Configuration Section -->
        <div class="card cb-card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Task Configuration</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-4 mb-3">
                <%= label(f, :task_provider, class: "form-label text-white") %>
                <%= select(f, :task_provider, Codebattle.Tournament.task_providers(),
                  class: "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                ) %>
                <%= error_tag(f, :task_provider) %>
              </div>
              <%= if (f.params["task_provider"] == "level") do %>
                <div class="col-md-4 mb-3">
                  <%= label(f, :level, class: "form-label text-white") %>
                  <%= select(f, :level, Codebattle.Task.levels(),
                    class:
                      "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                  ) %>
                  <%= error_tag(f, :level) %>
                </div>
              <% end %>
              <%= if (f.params["task_provider"] == "task_pack") do %>
                <div class="col-md-4 mb-3">
                  <%= label(f, :task_pack_name, class: "form-label text-white") %>
                  <%= select(f, :task_pack_name, @task_pack_names,
                    class:
                      "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded",
                    value: f.params["task_pack_name"] || f.data.task_pack_name
                  ) %>
                  <%= error_tag(f, :task_pack_name) %>
                </div>
              <% end %>
            </div>
          </div>
        </div>
        <!-- Tournament Limits Section -->
        <div class="card cb-card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Tournament Limits & Timing</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3 mb-3">
                <%= label(f, :rounds_limit, class: "form-label text-white") %>
                <%= select(f, :rounds_limit, Enum.to_list(1..42),
                  class: "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                ) %>
                <%= error_tag(f, :rounds_limit) %>
              </div>
              <div class="col-md-3 mb-3">
                <%= label(f, :players_limit, class: "form-label text-white") %>
                <%= select(
                  f,
                  :players_limit,
                  [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384],
                  class: "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                ) %>
                <%= error_tag(f, :players_limit) %>
              </div>
            </div>
            <div class="row">
              <div class="col-md-3 mb-3">
                <%= label(f, :round_timeout_seconds, class: "form-label text-white") %>
                <%= number_input(
                  f,
                  :round_timeout_seconds,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  max: "10000"
                ) %>
                <%= error_tag(f, :round_timeout_seconds) %>
              </div>
              <div class="col-md-3 mb-3">
                <%= label(f, :break_duration_seconds, class: "form-label text-white") %>
                <%= number_input(
                  f,
                  :break_duration_seconds,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  min: "0",
                  max: "1957"
                ) %>
                <%= error_tag(f, :break_duration_seconds) %>
              </div>
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <%= label(f, :ranking_type, class: "form-label text-white") %>
                <%= select(f, :ranking_type, Codebattle.Tournament.ranking_types(),
                  class:
                    "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded",
                  value: f.params["ranking_type"] || f.data.ranking_type
                ) %>
                <%= error_tag(f, :ranking_type) %>
              </div>
              <div class="col-md-4 mb-3">
                <%= label(f, :score_strategy, class: "form-label text-white") %>
                <%= select(f, :score_strategy, Codebattle.Tournament.score_strategies(),
                  class:
                    "form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded",
                  value: f.params["score_strategy"] || f.data.score_strategy
                ) %>
                <%= error_tag(f, :score_strategy) %>
              </div>
            </div>
          </div>
        </div>
        <!-- Advanced Settings Section -->
        <div class="card cb-card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Advanced Settings</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-12">
                <%= label(f, :meta_json, class: "form-label text-white") %>
                <%= textarea(f, :meta_json,
                  class:
                    "form-control custom-control cb-bg-panel cb-border-color text-white cb-rounded",
                  rows: 4,
                  value: f.params["meta_json"] || "{}"
                ) %>
                <%= error_tag(f, :meta_json) %>
              </div>
            </div>
          </div>
        </div>
        <!-- Action Buttons -->
        <div class="d-flex justify-content-between align-items-center mt-4">
          <a
            class="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
            href={Routes.tournament_path(@socket, :show, @tournament.id)}
          >
            <i class="fas fa-arrow-left me-1"></i> Back to Tournament
          </a>
          <%= submit("Update Tournament",
            phx_disable_with: "Updating...",
            class: "btn btn-secondary cb-btn-secondary cb-rounded px-4"
          ) %>
        </div>
      </.form>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
