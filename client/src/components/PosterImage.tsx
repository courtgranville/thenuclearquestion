interface PosterImageProps {
  webpSrc: string;
  pngSrc: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "lazy" | "eager";
}

export default function PosterImage({
  webpSrc,
  pngSrc,
  alt,
  width,
  height,
  className,
  loading,
}: PosterImageProps) {
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={pngSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading}
      />
    </picture>
  );
}
