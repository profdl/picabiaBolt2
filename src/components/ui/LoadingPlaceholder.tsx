import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingPlaceholderProps {
  isGenerating?: boolean;
}

export const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({
  isGenerating = false,
}) => {
  const [waitingMessage, setWaitingMessage] = useState(
    "Images typically take \n10-20 seconds to generate.\n\nThe first image can take up to 3 minutes"
  );

  useEffect(() => {
    const messages = [
      "...thanks for waiting.\nWe are working on it...",
      "Some images just take a while...",
      "What do you call a fish with no eyes?\nFsh.",
      "The first image can take up to 3 minutes",
      "Why don't eggs tell jokes?\nThey'd crack up!",
      "What do you call a bear with no teeth?\nA gummy bear!",
      "The first image can take up to 3 minutes",
      "What do you call a fake noodle?\nAn impasta!",
      "The first image can take up to 3 minutes",
      "Why did the scarecrow win an award?\nBecause he was outstanding in his field!",
      "What do you call a pig that does karate?\nA pork chop!",
      "The first image can take up to 3 minutes",
      "Why don't scientists trust atoms?\nBecause they make up everything!",
      "What do you call a sleeping bull?\nA bulldozer!",
      "Why did the math book look sad?\nBecause it had too many problems!",
      "The first image can take up to 3 minutes",
      "What did the grape say when it got stepped on?\nNothing, it just let out a little wine!",
      "Why don't skeletons fight each other?\nThey don't have the guts!",
    ];

    const timers = messages.map((message, index) => {
      return setTimeout(() => {
        setWaitingMessage(message);
      }, (index + 1) * 10000); // 10s, 20s, 30s, 40s, 50s, 60s
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4 animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      {isGenerating && (
        <p className="text-sm text-gray-600 text-center max-w-[280px] whitespace-pre-line">
          {waitingMessage}
        </p>
      )}
    </div>
  );
};
