"use client";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { PointerHighlight } from "@/components/ui/pointer-highlight";

export default function TypewriterTitle() {
  const words = [
    {
      text: "Response",
    },
    {
      text: "To",
    },
    {
      text: "Zip",
      className: "text-blue-500 dark:text-blue-500",
    },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center">
      <TypewriterEffectSmooth words={words} />
      <p className="text-neutral-400 text-sm sm:text-base text-center max-w-2xl">
        Convert AI-generated code responses into <PointerHighlight><span className="dark:text-blue-400">downloadable ZIP archives</span></PointerHighlight>
      </p>
    </div>
  );
}