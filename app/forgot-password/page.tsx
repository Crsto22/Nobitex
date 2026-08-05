import { Suspense } from "react";

import { ForgotPasswordPage } from "@/components/ForgotPassword/forgot-password-page";
import { GuestOnly } from "@/components/guest-only";
import { LoadingScreen } from "@/components/loading-screen";

export default function ForgotPassword() {
  return (
    <GuestOnly>
      <Suspense fallback={<LoadingScreen />}>
        <ForgotPasswordPage />
      </Suspense>
    </GuestOnly>
  );
}
