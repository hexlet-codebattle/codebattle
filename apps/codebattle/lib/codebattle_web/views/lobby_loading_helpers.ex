defmodule CodebattleWeb.LobbyLoadingHelpers do
  @moduledoc false

  use Phoenix.Component
  use Gettext, backend: CodebattleWeb.Gettext

  def lobby_loading_shell(assigns) do
    ~H"""
    <div
      id="lobby-loading-shell"
      class="cb-container-lg cb-text cb-lobby-loading"
      role="status"
      aria-live="polite"
    >
      <span class="cb-sr-only">{gettext("Loading...")}</span>
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
        <div class="cb-d-flex cb-flex-column-reverse flex-lg-row cb-my-0 cb-my-lg-2">
          <div class="cb-col-12 cb-col-lg-8 cb-p-0 cb-pr-lg-2 cb-my-2 cb-my-lg-0">
            <div class="cb-bg-panel cb-rounded cb-d-flex cb-flex-column cb-p-3 cb-lobby-loading-main">
              <span class="cb-text-skeleton cb-w-50 cb-mx-auto cb-mb-4"></span>
              <span class="cb-text-skeleton cb-w-100 cb-mb-2"></span>
              <span class="cb-text-skeleton cb-w-75 cb-mx-auto cb-mb-4"></span>
              <div class="cb-d-flex cb-flex-column flex-md-row cb-mt-auto">
                <span class="cb-text-skeleton cb-flex-fill cb-mx-md-2 cb-mb-2 cb-mb-md-0"></span>
                <span class="cb-text-skeleton cb-flex-fill cb-mx-md-2 cb-mb-2 cb-mb-md-0"></span>
                <span class="cb-text-skeleton cb-flex-fill cb-mx-md-2"></span>
              </div>
            </div>
          </div>
          <div class="cb-col-12 cb-col-lg-4 cb-p-0 cb-pl-lg-2 cb-my-2 cb-my-lg-0">
            <div class="cb-bg-panel cb-rounded cb-d-flex cb-flex-column cb-align-center cb-p-3 cb-lobby-loading-profile">
              <span class="cb-text-skeleton cb-lobby-loading-avatar cb-mb-3"></span>
              <span class="cb-text-skeleton cb-w-50 cb-mb-3"></span>
              <div class="cb-d-flex cb-w-100 cb-bg-highlight-panel cb-p-3">
                <span class="cb-text-skeleton cb-flex-fill cb-mx-1"></span>
                <span class="cb-text-skeleton cb-flex-fill cb-mx-1"></span>
                <span class="cb-text-skeleton cb-flex-fill cb-mx-1"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="cb-d-flex cb-flex-column flex-lg-row cb-p-0">
          <div class="cb-col-12 cb-col-lg-8 cb-p-0 cb-pr-lg-2">
            <div class="cb-bg-panel cb-rounded cb-p-3 cb-lobby-loading-secondary">
              <span class="cb-text-skeleton cb-w-25 cb-d-block cb-mb-4"></span>
              <span class="cb-text-skeleton cb-w-100 cb-d-block cb-mb-3"></span>
              <span class="cb-text-skeleton cb-w-75 cb-d-block cb-mb-3"></span>
              <span class="cb-text-skeleton cb-w-50 cb-d-block"></span>
            </div>
          </div>
          <div class="cb-col-12 cb-col-lg-4 cb-p-0 cb-pl-lg-2 cb-mt-2 cb-mt-lg-0">
            <div class="cb-bg-panel cb-rounded cb-p-3 cb-lobby-loading-secondary">
              <span class="cb-text-skeleton cb-w-50 cb-d-block cb-mb-4"></span>
              <span class="cb-text-skeleton cb-w-100 cb-d-block cb-mb-3"></span>
              <span class="cb-text-skeleton cb-w-75 cb-d-block"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
