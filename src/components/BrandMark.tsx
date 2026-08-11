type BrandMarkProps = {
  as?: 'span' | 'h1'
  className?: string
  showTagline?: boolean
  tagline?: string
}

export function BrandMark({
  as = 'span',
  className = '',
  showTagline = false,
  tagline,
}: BrandMarkProps) {
  const Tag = as

  return (
    <span className={`brand-mark ${className}`.trim()}>
      <Tag className="brand-mark__title">
        <span className="brand-mark__text">La suerte de Valentina</span>
        <img
          src="/mono.jpeg"
          alt=""
          className="brand-mark__bow"
          width={72}
          height={72}
          decoding="async"
        />
      </Tag>
      {showTagline && tagline ? <span className="brand-mark__tag">{tagline}</span> : null}
    </span>
  )
}
