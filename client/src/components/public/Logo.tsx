import { ImgHTMLAttributes } from 'react';
import { assetUrl } from '../../api/client';
import type { ImageRef } from '../../api/types';

export const DEFAULT_LOGO = '/assets/logo-full.png';

/** The one brand mark used everywhere on the site: the admin-chosen logo, or the built-in full logo. */
export function Logo({ image, alt, ...rest }: { image: ImageRef | null } & ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={image ? assetUrl(image.url) : DEFAULT_LOGO} alt={alt ?? (image?.alt || 'Through My Trails: Explore, Experience, Everywhere')} {...rest} />;
}
