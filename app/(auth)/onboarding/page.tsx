import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <AuthGate>
      <OnboardingWizard />
    </AuthGate>
  );
}
