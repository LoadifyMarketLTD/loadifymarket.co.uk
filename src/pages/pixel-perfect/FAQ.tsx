import { isApkNative } from "@/lib/apkDiagnostics";
import FAQMobile from "./FAQMobile";
import FAQWeb from "./FAQWeb";

export default function FAQ() {
  return isApkNative() ? <FAQMobile /> : <FAQWeb />;
}
