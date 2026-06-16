import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "./store.jsx";
import App from "./App.jsx";

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const fail = (status, body) => Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) });

function renderApp() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>
  );
}

describe("auth gate", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the login screen when not authenticated", async () => {
    global.fetch = vi.fn(() => fail(401, { error: "กรุณาเข้าสู่ระบบ" }));
    renderApp();
    expect(await screen.findByText("สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์เท่านั้น")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/agency.go.th/)).toBeInTheDocument();
  });

  it("logs in and reveals the app", async () => {
    const user = { id: 1, email: "a@b.com", name: "เจ้าหน้าที่ทดสอบ", role: "admin" };
    global.fetch = vi.fn((url, opts) => {
      if (url.startsWith("/api/auth/me")) return fail(401, {});
      if (url.startsWith("/api/auth/login")) return ok({ user });
      if (url.startsWith("/api/cases")) return ok({ cases: [], counts: { all: 0, pending: 0, review: 0, referred: 0, cleared: 0 } });
      if (url.startsWith("/api/context")) return ok({ items: [] });
      return ok({});
    });
    renderApp();
    await screen.findByText("สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์เท่านั้น");
    await userEvent.type(screen.getByPlaceholderText(/agency.go.th/), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    // After login the dashboard shell renders (stat card label is present)
    expect(await screen.findByText("เคสทั้งหมด · Total")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
  });
});
