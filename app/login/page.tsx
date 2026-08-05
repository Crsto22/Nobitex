import { LoginPage } from "@/components/Login/login-page";
import { GuestOnly } from "@/components/guest-only";

export default function Login() {
  return (
    <GuestOnly>
      <LoginPage />
    </GuestOnly>
  );
}
