import React from "react";

import { KEYS } from "@drawboard/common";

import { Drawboard } from "../../index";
import { Keyboard } from "../../tests/helpers/ui";
import {
  render,
  waitFor,
  getByTestId,
  fireEvent,
} from "../../tests/test-utils";

describe("Test <DropdownMenu/>", () => {
  it("should", async () => {
    const { container } = await render(<Drawboard />);

    expect(window.h.state.openMenu).toBe(null);

    fireEvent.click(getByTestId(container, "main-menu-trigger"));
    expect(window.h.state.openMenu).toBe("canvas");

    await waitFor(() => {
      Keyboard.keyDown(KEYS.ESCAPE);
      expect(window.h.state.openMenu).toBe(null);
    });
  });
});
