import { useSearchParams } from "react-router-dom";
import { ActivationScanPage } from "./ActivationScanPage";

/**
 * Wrapper that detects if app is in pre-activation mode.
 * Check URL for ?activation_token= param — if present, show activation flow.
 */
export function ActivationModePage() {
  const [searchParams] = useSearchParams();
  const activationToken = searchParams.get("activation_token");

  if (activationToken) {
    return <ActivationScanPage />;
  }

  return null;
}
