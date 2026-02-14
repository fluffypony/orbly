import { Component } from "solid-js";
import { acceptCertificateException, navigateBack } from "../../lib/ipc";

interface CertificateWarningProps {
  appId: string;
  appName: string;
  host?: string;
  message?: string;
}

const CertificateWarning: Component<CertificateWarningProps> = (props) => {
  const handleAccept = async () => {
    try {
      const host = props.host || new URL(props.message || "").hostname;
      await acceptCertificateException(host, 30);
      // Reload will be triggered by the caller
    } catch (err) {
      console.error("Failed to accept certificate exception:", err);
    }
  };

  const handleGoBack = async () => {
    try {
      await navigateBack(props.appId);
    } catch (err) {
      console.error("Failed to navigate back:", err);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 gap-4 p-8">
      <div class="text-5xl">🔒</div>
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Certificate Warning
      </h2>
      <p class="text-sm text-center max-w-md">
        The certificate for <strong>{props.appName}</strong> could not be verified.
        {props.message && (
          <span class="block mt-1 text-xs text-gray-400">{props.message}</span>
        )}
      </p>
      <p class="text-xs text-center max-w-md text-gray-400">
        If you trust this site, you can accept the risk and continue. The exception will expire after 30 days.
      </p>
      <div class="flex gap-3 mt-2">
        <button
          class="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
          onClick={handleGoBack}
        >
          Go Back
        </button>
        <button
          class="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer"
          onClick={handleAccept}
        >
          Accept Risk (30 days)
        </button>
      </div>
    </div>
  );
};

export default CertificateWarning;
