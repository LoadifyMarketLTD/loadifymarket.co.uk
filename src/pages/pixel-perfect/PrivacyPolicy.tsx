import { isApkNative } from "@/lib/apkDiagnostics";
import PrivacyPolicyMobile from "./PrivacyPolicyMobile";
import PrivacyPolicyWeb from "./PrivacyPolicyWeb";

export default function PrivacyPolicy() {
  return isApkNative() ? <PrivacyPolicyMobile /> : <PrivacyPolicyWeb />;
}
