import { useRef } from 'react';
import { assetUrl } from '../../api/client';
import type { ImageRef } from '../../api/types';
import { useParallax } from '../../hooks/useParallax';
import { waLink } from '../../lib/format';
import { ArrowDown, ChatIcon, PLANE_PATH } from '../illustrations/Icons';

interface Props {
  heroImage: ImageRef | null;
  logoImage: ImageRef | null;
  whatsapp: string;
  instagram: string;
}

export function Hero({ heroImage, logoImage, whatsapp, instagram }: Props) {
  const root = useRef<HTMLElement>(null);
  useParallax(root);

  return (
    <section id="top" className="hero" ref={root}>
      <svg className="layer" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#B08654" strokeWidth="1.4" opacity="0.7">
        <path className="draw" d="M-20 60 C 80 120, 60 200, 170 260 S 250 360, 330 380" />
        <path className="draw" d="M-20 90 C 70 150, 40 230, 150 290 S 230 390, 300 420" />
        <path className="draw" d="M-20 120 C 60 180, 20 260, 130 320 S 210 420, 270 460" />
        <path className="draw" d="M1460 640 C 1380 620, 1360 700, 1280 720 S 1200 820, 1140 920" />
        <path className="draw" d="M1460 680 C 1390 660, 1380 740, 1300 760 S 1230 860, 1180 930" />
      </svg>
      <svg className="layer" data-speed="0.18" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <path d="M0 700 L120 610 L210 660 L350 540 L470 640 L560 590 L700 680 L820 600 L960 690 L1100 580 L1240 660 L1340 620 L1440 660 L1440 900 L0 900 Z" fill="#E3D6C1" />
        <path d="M350 540 L380 566 L362 562 L350 574 L336 562 L322 568 Z M1100 580 L1128 604 L1112 600 L1100 612 L1088 600 L1074 606 Z" fill="#F4ECDF" />
      </svg>
      <svg className="layer" data-speed="0.32" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <path d="M0 760 L150 670 L280 740 L430 650 L600 750 L760 680 L900 760 L1060 690 L1220 770 L1340 720 L1440 750 L1440 900 L0 900 Z" fill="#D2C0A3" />
      </svg>
      <svg className="layer" data-speed="0.46" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <path d="M0 820 C200 770 380 830 620 790 C860 750 1080 830 1260 790 C1360 770 1410 780 1440 785 L1440 900 L0 900 Z" fill="#BCA586" />
        <path d="M700 900 C 690 860, 760 850, 740 820 C 725 800, 780 790, 800 780" stroke="#EFE6D8" strokeWidth="10" fill="none" strokeLinecap="round" opacity=".7" />
        <g fill="#6E5840" className="sway">
          <path d="M40 900 L40 720 L10 790 L30 786 L0 840 L28 834 L-8 890 Z M40 720 L70 790 L50 786 L80 840 L52 834 L88 890 L40 900 Z" />
          <path d="M120 900 L120 760 L96 816 L112 813 L88 856 L110 852 L82 896 Z M120 760 L144 816 L128 813 L152 856 L130 852 L158 896 L120 900 Z" />
          <path d="M180 900 L180 800 L162 840 L174 838 L156 872 L172 868 L150 900 Z M180 800 L198 840 L186 838 L204 872 L188 868 L210 900 Z" />
        </g>
      </svg>

      <div className="wrap hero-grid" data-fade="1">
        <div className="hero-copy">
          <p className="caps fade-up hero-kicker" style={{ animationDelay: '.1s' }}>
            Travel planner · Flights · Hotels · Holidays
          </p>
          <p className="script fade-up hero-script" style={{ animationDelay: '.25s' }}>
            Your next journey awaits
          </p>
          <h1 className="hero-title">
            <span className="word" style={{ animationDelay: '.4s' }}>Travel,</span>{' '}
            <span className="word" style={{ animationDelay: '.5s' }}>planned</span>
            <br />
            <span className="word" style={{ animationDelay: '.6s' }}>around</span>{' '}
            <em className="word" style={{ animationDelay: '.7s' }}>you.</em>
          </h1>
          <p className="fade-up hero-sub" style={{ animationDelay: '.9s' }}>
            Personalised itineraries, flight help, handpicked hotels and budget-friendly planning. You dream it, we map it, you just pack.
          </p>
          <div className="fade-up hero-ctas" style={{ animationDelay: '1.05s' }}>
            <a className="btn dark" href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer">
              <ChatIcon size={20} />
              Plan my trip on WhatsApp
            </a>
            <a className="btn line" href={`https://www.instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer">
              Follow the trails
            </a>
          </div>
        </div>

        <div className="hero-logo logo-in">
          <svg className="spin ring" viewBox="0 0 480 480" aria-hidden="true">
            <circle cx="240" cy="240" r="232" fill="none" stroke="#B08654" strokeWidth="1.2" strokeDasharray="2 9" />
          </svg>
          <svg className="spin rev ring" viewBox="0 0 480 480" aria-hidden="true">
            <g transform="translate(240 8) rotate(180) scale(1.3)">
              <path d={PLANE_PATH} fill="#6B4E35" />
            </g>
          </svg>
          {heroImage ? (
            <img className="photo-img" src={assetUrl(heroImage.url)} alt={heroImage.alt || 'Through My Trails'} />
          ) : (
            <img
              className="logo-img"
              src={logoImage ? assetUrl(logoImage.url) : '/assets/logo-full.png'}
              alt={logoImage?.alt || 'Through My Trails — Explore, Experience, Everywhere'}
            />
          )}
        </div>
      </div>

      <a href="#about" className="scroll-cue" aria-label="Scroll to explore">
        <ArrowDown color="#F7F1E7" />
      </a>
    </section>
  );
}
