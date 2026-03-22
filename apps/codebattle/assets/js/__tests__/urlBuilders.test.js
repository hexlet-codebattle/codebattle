import { getCustomEventPlayerDefaultImgUrl } from "../widgets/utils/urlBuilders";

describe("urlBuilders", () => {
  test("builds a local svg placeholder for missing player avatars", () => {
    const avatarUrl = getCustomEventPlayerDefaultImgUrl({ name: "vtm" });

    expect(avatarUrl).toContain("data:image/svg+xml,");
    expect(avatarUrl).not.toContain("ui-avatars.com");

    const svg = decodeURIComponent(avatarUrl.replace("data:image/svg+xml,", ""));

    expect(svg).toContain("fill='#FF621E'");
    expect(svg).toContain(">VT<");
  });
});
