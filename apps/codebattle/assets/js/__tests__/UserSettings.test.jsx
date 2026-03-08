import React from "react";

import "@testing-library/jest-dom";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

import UserSettings from "../widgets/pages/settings";
import reducers from "../widgets/slices";

jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: "img",
}));

jest.mock("calcite-react/Slider", () => "input");
jest.mock("../widgets/components/LanguageIcon", () => () => null);
jest.mock("react-bootstrap/Alert", () => ({
  __esModule: true,
  default: ({ children, variant, show }) =>
    show ? (
      <div role="alert" className={`alert-${variant}`}>
        {children}
      </div>
    ) : null,
}));

const reducer = combineReducers(reducers);

const preloadedState = {
  user: {
    settings: {
      soundSettings: {
        type: "standard",
        level: 6,
        tournamentLevel: 4,
      },
      id: 11,
      name: "Diman",
      lang: "ts",
      avatarUrl: "/assets/images/logo.svg",
      discordName: null,
      discordId: null,
      error: "",
    },
  },
};
const store = configureStore({
  reducer,
  preloadedState,
});
jest.mock(
  "gon",
  () => {
    const gonParams = {
      local: "en",
      current_user: { sound_settings: {} },
      game_id: 10,
    };
    return { getAsset: (type) => gonParams[type] };
  },
  { virtual: true },
);

describe("UserSettings test cases", () => {
  function setup(jsx) {
    return {
      user: userEvent.setup(),
      ...render(jsx),
    };
  }

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test("render main component", () => {
    const { getByText } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    expect(getByText(/settings/i)).toBeInTheDocument();
  });

  test("successfull user settings update", async () => {
    const settingUpdaterSpy = global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const { getByRole, getByLabelText, getByTestId, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText("SubmitForm");
    const nameInput = getByTestId("nameInput");
    const codeLangSelect = getByTestId("code-langSelect");

    await user.clear(nameInput);
    await user.type(nameInput, "Dmitry");
    await user.selectOptions(codeLangSelect, "Javascript");
    await user.click(submitButton);

    await waitFor(() => {
      expect(settingUpdaterSpy).toHaveBeenCalledWith(
        "/api/v1/settings",
        expect.objectContaining({
          method: "PATCH",
        }),
      );

      const [, requestOptions] = settingUpdaterSpy.mock.calls[0];
      expect(JSON.parse(requestOptions.body)).toEqual({
        clan: "",
        name: "Dmitry",
        lang: "js",
        lang_view: "code",
        db_type: "",
        style_lang: "",
        sound_settings: {
          level: 6,
          tournament_level: 4,
          type: "standard",
        },
      });
      expect(getByRole("alert")).toHaveClass("alert-success");
    });
  });

  test("successfull locale change", async () => {
    const settingUpdaterSpy = global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const { getByLabelText, getByTestId, findByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText("SubmitForm");
    const localeSelect = getByTestId("localeSelect");

    await user.click(localeSelect);
    await user.click(await findByText("Ru"));
    await user.click(submitButton);

    await waitFor(() => {
      const [, requestOptions] = settingUpdaterSpy.mock.calls[0];
      expect(JSON.parse(requestOptions.body)).toMatchObject({
        locale: "ru",
      });
    });
  });

  test("failed user settings update", async () => {
    const { getByTestId, getByLabelText, findByRole, findByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText("SubmitForm");
    const nameInput = getByTestId("nameInput");

    await user.clear(nameInput);

    expect(await findByText(/Field can't be empty/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await user.type(nameInput, "   ");

    expect(
      await findByText(
        /Must consist of Latin letters, numbers and underscores. Only begin with latin letter/i,
      ),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        errors: {
          name: ["has already been taken"],
        },
      }),
    });

    await user.clear(nameInput);
    await user.type(nameInput, "ExistingUserName");

    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(await findByText(/Has already been taken/i)).toBeInTheDocument();

    global.fetch.mockRejectedValueOnce(new Error("Network Error"));

    await user.clear(nameInput);
    await user.type(nameInput, "CoolUserName");
    await user.click(submitButton);

    expect(await findByRole("alert")).toHaveClass("alert-danger");
  });
});
