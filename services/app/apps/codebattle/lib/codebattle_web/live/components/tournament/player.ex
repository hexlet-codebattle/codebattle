defmodule CodebattleWeb.Live.Tournament.PlayerComponent do
  use CodebattleWeb, :component

  def render(assigns) do
    ~H"""
    <div class="d-flex align-items-center">
      <a class="d-inline-flex align-items-center" href={"/users/#{@player.id}"}>
        <img class="attachment rounded border mr-1 cb-user-avatar" src={@player.avatar_url} />
        <span class="mr-1 text-truncate" style="max-width: 130px;"><%= @player.name %></span>
      </a>
      <small class="mr-1"><%= @player.rating %></small>
    </div>
    """
  end
end
