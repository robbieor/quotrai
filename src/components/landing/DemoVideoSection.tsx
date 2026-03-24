import { Play } from "lucide-react";
import { useState, useRef } from "react";

export function DemoVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3">
            See Quotr in{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              60 seconds.
            </span>
          </h2>
          <p className="text-base text-muted-foreground">
            From quote to payment — watch how it works.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl shadow-primary/5 bg-foreground/5">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            muted
            playsInline
            loop
            preload="metadata"
            poster=""
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={() => {
              if (videoRef.current?.paused) handlePlay();
              else { videoRef.current?.pause(); setIsPlaying(false); }
            }}
          >
            <source src="/quotr-demo.mp4" type="video/mp4" />
          </video>

          {/* Play overlay */}
          {!isPlaying && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-foreground/20 cursor-pointer group"
              aria-label="Play demo video"
            >
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary flex items-center justify-center shadow-glow-teal group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground ml-1" />
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
