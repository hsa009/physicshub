import type { Slide as SlideType } from "../types";
import { renderBody } from "../lib/format";

interface SlideProps {
  slide: SlideType;
  lessonName: string;
  
  slideNumber: number;
  totalSlides: number;
}

export default function Slide({
  slide,
  lessonName,
  slideNumber,
  totalSlides,
}: SlideProps) {
  return (
    <article className="slide-fade-in" aria-label={`${slideNumber} of ${totalSlides}: ${slide.title}`}>
      <div className="mb-6 flex items-center gap-4">
        <div className="gold-line" />
        <span className="eyebrow">
          Slide {slideNumber} of {totalSlides} · {lessonName}
        </span>
      </div>

      <h2 className="slide-title">{slide.title}</h2>

      <div
        className={`mt-10 grid grid-cols-1 gap-10 md:gap-14 ${
          slide.image ? "md:grid-cols-5" : ""
        }`}
      >
        <div className={slide.image ? "md:col-span-3" : "md:col-span-5"}>
          <p className="slide-body">{renderBody(slide.body)}</p>

          {slide.formula && (
            <div className="formula-card mt-10">
              <div className="text-[0.6rem] uppercase tracking-eyebrow text-gold">
                {slide.formula.label}
              </div>
              <div className="formula-expression">
                {slide.formula.expression}
              </div>
            </div>
          )}
        </div>

        {slide.image && (
          <figure className="md:col-span-2">
            <div className="border border-border-mid bg-bg-card p-2">
              <img
                src={slide.image.src}
                alt={slide.image.alt}
                className="block w-full h-auto"
                loading="lazy"
              />
            </div>
            {slide.image.caption && (
              <figcaption className="mt-3 text-[0.78rem] italic leading-[1.6] text-text-label text-center">
                {slide.image.caption}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </article>
  );
}
