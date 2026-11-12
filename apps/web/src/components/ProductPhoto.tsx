import { Coffee } from 'lucide-react';

export function ProductPhoto({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-amber-50">
      <div className="absolute inset-0 grid place-items-center text-amber-800" aria-hidden="true">
        <Coffee size={36} strokeWidth={1.25} />
      </div>
      {imageUrl && (
        // Product image URLs are supplied by the API.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="relative h-full w-full object-cover transition-transform motion-safe:group-hover:scale-[1.03]" />
      )}
    </div>
  );
}
