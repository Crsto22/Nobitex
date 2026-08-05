import { RegisterPage } from "@/components/Register/register-page";
import { GuestOnly } from "@/components/guest-only";

export default function Register() {
  return (
    <GuestOnly>
      <RegisterPage />
    </GuestOnly>
  );
}
