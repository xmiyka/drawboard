import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://www.drawboard.com", ["drawboard.com"]),
    ).toBe(true);
    expect(validateLibraryUrl("https://drawboard.com", ["drawboard.com"])).toBe(
      true,
    );
    expect(
      validateLibraryUrl("https://library.drawboard.com", ["drawboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.drawboard.com", [
        "library.drawboard.com",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/", ["drawboard.com/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com", ["drawboard.com/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/", ["drawboard.com"]),
    ).toBe(true);

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://drawboard.com/path", ["drawboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/path/", ["drawboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/specific/path", [
        "drawboard.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/specific/path/", [
        "drawboard.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/specific/path", [
        "drawboard.com/specific/path/",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawboard.com/specific/path/other", [
        "drawboard.com/specific/path",
      ]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://xdrawboard.com", ["drawboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://x-drawboard.com", ["drawboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.comx", ["drawboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.comx", ["drawboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.com.mx", ["drawboard.com"]),
    ).toThrow();
    // protocol must be https
    expect(() =>
      validateLibraryUrl("http://drawboard.com.mx", ["drawboard.com"]),
    ).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://drawboard.com/specific/other/path", [
        "drawboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.com/specific/paths", [
        "drawboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.com/specific/path-s", [
        "drawboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawboard.com/some/specific/path", [
        "drawboard.com/specific/path",
      ]),
    ).toThrow();
  });
});
