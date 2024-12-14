import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const LoadingPlaceholder = () => {
  const [waitingMessage, setWaitingMessage] = useState(
    "Images typically take \n10-20 seconds to generate.\n\nThe first image can take up to 3 minutes"
  );

  useEffect(() => {
    const messageTimer = setTimeout(() => {
      setWaitingMessage("...thanks for waiting.\nWe are working on it...");
    }, 20000);

    return () => clearTimeout(messageTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4 animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600 text-center max-w-[280px] whitespace-pre-line">
        {waitingMessage}
      </p>
    </div>
  );
};
