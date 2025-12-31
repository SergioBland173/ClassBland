'use client'

import Image from 'next/image'

export function CatImage() {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors">
      <Image
        src="https://cataas.com/cat?width=100&height=100"
        alt="Gato mascota"
        width={36}
        height={36}
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  )
}
