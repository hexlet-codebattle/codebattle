defmodule CodebattleWeb.LobbyLoadingHelpers do
  @moduledoc false

  use Phoenix.Component
  use Gettext, backend: CodebattleWeb.Gettext

  def lobby_loading_shell(assigns) do
    ~H"""
    <div
      id="lobby-loading-shell"
      class="container-lg cb-text cb-lobby-loading"
      role="status"
      aria-live="polite"
    >
      <span class="sr-only">{gettext("Loading...")}</span>
      <div aria-hidden="true">
        <div class="cb-lobby-loading-hero">
          <div class="cb-lobby-loading-emblem">
            <span>&lt;/&gt;</span>
          </div>
          <div class="cb-lobby-loading-copy">
            <span class="cb-lobby-loading-kicker">
              <span class="cb-lobby-loading-status-dot"></span>
              {gettext("Codebattle lobby")}
            </span>
            <h1>{gettext("Preparing your arena")}</h1>
            <p>{gettext("Syncing live games, rankings, and challengers...")}</p>
            <div class="cb-lobby-loading-progress">
              <span></span>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column-reverse flex-lg-row my-0 my-lg-2">
          <div class="col-12 col-lg-8 p-0 pr-lg-2 my-2 my-lg-0">
            <div class="cb-bg-panel cb-rounded d-flex flex-column p-3 cb-lobby-loading-main">
              <span class="cb-text-skeleton w-50 mx-auto mb-4"></span>
              <span class="cb-text-skeleton w-100 mb-2"></span>
              <span class="cb-text-skeleton w-75 mx-auto mb-4"></span>
              <div class="d-flex flex-column flex-md-row mt-auto">
                <span class="cb-text-skeleton flex-fill mx-md-2 mb-2 mb-md-0"></span>
                <span class="cb-text-skeleton flex-fill mx-md-2 mb-2 mb-md-0"></span>
                <span class="cb-text-skeleton flex-fill mx-md-2"></span>
              </div>
            </div>
          </div>
          <div class="col-12 col-lg-4 p-0 pl-lg-2 my-2 my-lg-0">
            <div class="cb-bg-panel cb-rounded d-flex flex-column align-items-center p-3 cb-lobby-loading-profile">
              <span class="cb-text-skeleton cb-lobby-loading-avatar mb-3"></span>
              <span class="cb-text-skeleton w-50 mb-3"></span>
              <div class="d-flex w-100 cb-bg-highlight-panel p-3">
                <span class="cb-text-skeleton flex-fill mx-1"></span>
                <span class="cb-text-skeleton flex-fill mx-1"></span>
                <span class="cb-text-skeleton flex-fill mx-1"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-lg-row p-0">
          <div class="col-12 col-lg-8 p-0 pr-lg-2">
            <div class="cb-bg-panel cb-rounded p-3 cb-lobby-loading-secondary">
              <span class="cb-text-skeleton w-25 d-block mb-4"></span>
              <span class="cb-text-skeleton w-100 d-block mb-3"></span>
              <span class="cb-text-skeleton w-75 d-block mb-3"></span>
              <span class="cb-text-skeleton w-50 d-block"></span>
            </div>
          </div>
          <div class="col-12 col-lg-4 p-0 pl-lg-2 mt-2 mt-lg-0">
            <div class="cb-bg-panel cb-rounded p-3 cb-lobby-loading-secondary">
              <span class="cb-text-skeleton w-50 d-block mb-4"></span>
              <span class="cb-text-skeleton w-100 d-block mb-3"></span>
              <span class="cb-text-skeleton w-75 d-block"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
