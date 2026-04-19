import React from "react";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import UserName from "../widgets/components/UserName";

jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: "span",
}));

jest.mock("../widgets/components/LanguageIcon", () => () => <span data-testid="language-icon" />);

describe("UserName", () => {
  test("renders the user name as-is", () => {
    render(
      <UserName
        user={{ id: 1, name: "A-211250(2011)", rank: 2011, isBot: false, lang: "js" }}
        hideLink
        hideOnlineIndicator
      />,
    );

    expect(screen.getByText("A-211250(2011)")).toBeInTheDocument();
  });

  test("does not append rank to the rendered user name", () => {
    const { container } = render(
      <UserName
        user={{ id: 1, name: "A-211250", rank: 2011, isBot: false, lang: "js" }}
        hideLink
        hideOnlineIndicator
      />,
    );

    expect(screen.getByText("A-211250")).toBeInTheDocument();
    expect(container).toHaveTextContent("A-211250");
    expect(container).not.toHaveTextContent("A-211250(2011)");
  });

  test("renders bot icon without language icon for bots", () => {
    const { container } = render(
      <UserName
        user={{ id: -1, name: "CasperDesigner", isBot: true, lang: "js" }}
        hideLink
        hideOnlineIndicator
      />,
    );

    expect(screen.getByText("CasperDesigner")).toBeInTheDocument();
    expect(screen.queryByTestId("language-icon")).not.toBeInTheDocument();
    expect(container.querySelectorAll("span").length).toBeGreaterThan(0);
  });
});
