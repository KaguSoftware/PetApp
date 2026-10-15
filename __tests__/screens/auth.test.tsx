import { screen } from "@testing-library/react-native";
import ForgotScreen from "@/app/(auth)/forgot";
import LoginScreen from "@/app/(auth)/login";
import SignupScreen from "@/app/(auth)/signup";
import WelcomeScreen from "@/app/(auth)/welcome";
import NotFound from "@/app/+not-found";
import VerifyScreen from "@/app/verify";
import { prepare, renderScreen } from "./_support/render";

describe("Auth screens (signed out)", () => {
  beforeEach(() => prepare("signedOut"));

  it("welcome", async () => {
    await renderScreen(<WelcomeScreen />);
    expect(screen.getByText("Continue with email")).toBeTruthy();
    expect(screen.getByText("Create an account")).toBeTruthy();
  });

  it("login", async () => {
    await renderScreen(<LoginScreen />);
    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByText("Log in")).toBeTruthy();
  });

  it("signup", async () => {
    await renderScreen(<SignupScreen />);
    expect(screen.getByText("Let's get started")).toBeTruthy();
    expect(screen.getByText("Create account")).toBeTruthy();
  });

  it("forgot", async () => {
    await renderScreen(<ForgotScreen />);
    expect(screen.getByText("Forgot password?")).toBeTruthy();
    expect(screen.getByText("Send code")).toBeTruthy();
  });

  it("verify with an email", async () => {
    prepare("signedOut", { email: "me@example.com", purpose: "signup" });
    await renderScreen(<VerifyScreen />);
    expect(screen.getAllByText(/me@example\.com/).length).toBeGreaterThan(0);
  });

  it("verify bounced from a failed link shows the error", async () => {
    prepare("signedOut", { error: "Link expired" });
    await renderScreen(<VerifyScreen />);
    expect(screen.getByText("Link expired")).toBeTruthy();
  });

  it("not-found", async () => {
    await renderScreen(<NotFound />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect(screen.getByText("Take me home")).toBeTruthy();
  });
});
