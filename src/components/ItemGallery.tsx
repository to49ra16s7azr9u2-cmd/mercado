"use client";

import { useState } from "react";

export function ItemGallery({
  images,
  title,
  sold,
}: {
  images: { id: number; url: string }[];
  title: string;
  sold: boolean;
}) {
  const [index, setIndex] = useState(0);
  const list = images.length ? images : [{ id: 0, url: "/api/photo?seed=empty&e=%F0%9F%93%A6" }];
  const current = list[Math.min(index, list.length - 1)];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={title} className="h-full w-full object-contain" />
        {sold && (
          <span className="sold-ribbon absolute left-0 top-0 rounded-br-2xl px-5 py-2 text-sm font-bold text-white">
            VENDIDO
          </span>
        )}
        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
              className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-lg shadow"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => setIndex((i) => (i + 1) % list.length)}
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/90 text-lg shadow"
            >
              ›
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {Math.min(index, list.length - 1) + 1} / {list.length}
            </span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === index ? "border-brand" : "border-line"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
