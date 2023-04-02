defmodule CodebattleWeb.Live.Tournament.StairwayRoundsComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.StairwayRoundComponent

  def render(assigns) do
    ~H"""
    <div class="col-12 mt-3">
      <nav>
        <div class="nav nav-tabs bg-gray" id="nav-tab" role="tablist">
          <%= for round <- 0..(@tournament.meta.rounds_limit - 1) do %>
            <a
              id={"round-tab-#{round}"}
              class={"flex-grow-1 nav-item nav-link rounded-0 text-black font-weight-bold cursor-pointer  text-center " <> default_tab_class(@tournament.current_round, round)}
              role="tab"
              phx-click={
                set_active_tab("#round-tab-#{round}")
                |> show_active_content("#content-round-tab-#{round}")
              }
            >
              Round <%= round %>
            </a>
          <% end %>
        </div>
      </nav>

      <div id="content" class="tab-body">
        <%= for round <- 0..(@tournament.meta.rounds_limit - 1) do %>
          <div
            id={"content-round-tab-#{round}"}
            class={"tab-content font-weight-light " <> default_content_class(@tournament.current_round, round)}
          >
            <StairwayRoundComponent.render
              tournament={@tournament}
              round_task={get_round_task(@tournament, round) || %{}}
              current_user_id={@current_user_id}
              current_round={@tournament.current_round}
              round={round}
              matches={Enum.at(@round_matches, round, [])}
            />
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  def default_tab_class(current_round, round) do
    if current_round == round, do: "active", else: ""
  end

  def default_content_class(current_round, round) do
    if current_round == round, do: "", else: "hidden"
  end

  defp show_active_content(js, to) do
    js
    |> JS.hide(to: "div.tab-content")
    |> JS.show(to: to, transition: "fade-in-scale")
  end

  defp set_active_tab(js \\ %JS{}, tab) do
    js
    |> JS.remove_class("active", to: "a.nav-item")
    |> JS.add_class("active", to: tab)
  end
end
