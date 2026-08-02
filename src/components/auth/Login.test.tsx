import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"
import Login from "./Login"
describe("Login Component", () => {

  const mockOnLoginSuccess = vi.fn()
  const mockOnNavigateToRegister = vi.fn()

  test("renderiza los campos de correo y contraseña", () => {
    render(
      <Login 
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateToRegister={mockOnNavigateToRegister}
      />
    )

    const emailInput = screen.getByLabelText(/correo electrónico/i)
    const passwordInput = screen.getByLabelText(/contraseña/i)

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
  })
  test("envía las credenciales correctas al backend", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ token: "123", user: {} })
  } as Response)

  render(
    <Login
      onLoginSuccess={vi.fn()}
      onNavigateToRegister={vi.fn()}
    />
  )

  await userEvent.type(screen.getByLabelText(/correo electrónico/i), "test@test.com")
  await userEvent.type(screen.getByLabelText(/contraseña/i), "123456")

  await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/auth/login"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456"
      })
    })
  )
})
test("guarda el token en localStorage cuando el login es exitoso", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      token: "fake-token",
      user: { id: 1 }
    })
  } as Response)

  const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

  render(
    <Login
      onLoginSuccess={vi.fn()}
      onNavigateToRegister={vi.fn()}
    />
  )

  await userEvent.type(screen.getByLabelText(/correo electrónico/i), "test@test.com")
  await userEvent.type(screen.getByLabelText(/contraseña/i), "123456")
  await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

  expect(setItemSpy).toHaveBeenCalledWith("token", "fake-token")
})
test("muestra error cuando el servidor responde mal", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    json: async () => ({ message: "Credenciales inválidas" })
  } as Response)

  render(
    <Login
      onLoginSuccess={vi.fn()}
      onNavigateToRegister={vi.fn()}
    />
  )

  await userEvent.type(screen.getByLabelText(/correo electrónico/i), "bad@test.com")
  await userEvent.type(screen.getByLabelText(/contraseña/i), "wrong")
  await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

  expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument()
})
  test("permite escribir en los inputs", async () => {
    render(
      <Login 
        onLoginSuccess={mockOnLoginSuccess}
        onNavigateToRegister={mockOnNavigateToRegister}
      />
    )

    const emailInput = screen.getByLabelText(/correo electrónico/i)

    await userEvent.type(emailInput, "test@test.com")

    expect(emailInput).toHaveValue("test@test.com")
  })

})