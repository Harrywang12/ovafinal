"use client";

import { useId, useRef } from "react";
import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import type { Lesson } from "../../lib/module-content";
import {
  infographicPath,
  learnInfographics,
} from "../../lib/learn-infographics";

export function LessonInfographic({ lesson }: { lesson: Lesson }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const spec = learnInfographics[lesson.id];
  if (!spec) throw new Error(`Missing infographic for lesson: ${lesson.id}`);

  const illustration = (expanded = false) => (
    <Image
      src={infographicPath(lesson.id)}
      alt={spec.caption}
      width={640}
      height={440}
      unoptimized
      loading={expanded ? "lazy" : "eager"}
      className={expanded ? "h-auto w-full min-w-[640px]" : "h-auto w-full"}
    />
  );

  return (
    <figure className="learn-infographic" data-lesson-infographic={lesson.id}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-primary mb-1">Visual guide</p>
          <h3 className="text-2xl leading-tight text-ink">{spec.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="inline-flex min-h-11 items-center gap-2 rounded border border-border px-3 text-xs font-semibold text-ink hover:bg-surface"
          aria-label={`Enlarge diagram: ${spec.title}`}
        >
          <Maximize2 size={15} aria-hidden="true" />
          Enlarge
        </button>
      </div>
      {illustration()}
      <figcaption className="space-y-4 p-5 text-sm leading-relaxed text-muted">
        <p>{spec.caption}</p>
        <ul className="space-y-2 border-t border-border pt-4">
          {spec.notes.map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </figcaption>
      <dialog
        ref={dialog}
        className="learn-infographic-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-5 border-b border-border p-5">
          <div>
            <h3 id={titleId} className="text-2xl text-ink">
              {spec.title}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Scroll across the diagram to inspect every detail.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border hover:bg-surface"
            aria-label="Close enlarged diagram"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[65dvh] overflow-auto">{illustration(true)}</div>
        <p className="border-t border-border p-5 text-sm leading-relaxed text-muted">
          {spec.caption}
        </p>
      </dialog>
    </figure>
  );
}
